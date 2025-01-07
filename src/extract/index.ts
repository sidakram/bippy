import {
  instrument,
  secure,
  createFiberVisitor,
  traverseFiber,
  getFiberId,
  type Fiber,
  type FiberRoot,
  isCompositeFiber,
  traverseProps,
  isHostFiber,
  getFiberFromHostInstance,
  getFiberStack,
  getDisplayName,
} from '../index.js';

export interface PrintedReactSpecTree {
  root: BaseReactSpecNode;
}

export enum ReactSpecNodeType {
  Component = 'component',
  Element = 'element',
  A11y = 'a11y',
}

export interface BaseReactSpecNode {
  type: ReactSpecNodeType;
  children: ReactSpecNode[];
}

export interface ReactElementSpecNode extends BaseReactSpecNode {
  x: number;
  y: number;
  width: number;
  height: number;
  eventHandlers: Record<string, string>;
  html: string;
  classes: string[];
  styles: Record<string, unknown>;
}

export interface ReactA11ySpecNode extends ReactElementSpecNode {
  type: ReactSpecNodeType.A11y;
  role: string | null;
  ariaLabel: string | null;
}

export interface ReactComponentSpecNode extends BaseReactSpecNode {
  type: ReactSpecNodeType.Component;
  props: Record<string, unknown>;
  name: string | null;
}

export type ReactSpecNode =
  | ReactElementSpecNode
  | ReactA11ySpecNode
  | ReactComponentSpecNode;

declare global {
  var __RST__: boolean;
}
const fiberRoots = new Set<FiberRoot>();

const getDpr = () => {
  return Math.min(window.devicePixelRatio || 1, 2);
};

const CANVAS_HTML_STR = `<canvas style="position:fixed;top:0;left:0;pointer-events:none;z-index:2147483646" aria-hidden="true"></canvas>`;
export const primaryColor = '115,97,230';

const lerp = (start: number, end: number) => {
  return Math.floor(start + (end - start) * 0.2);
};

export const init = () => {
  let hasInitedIds = false;
  let prevX: number | undefined;
  let prevY: number | undefined;
  let isAnimating = false;

  const handleFiber = (fiber: Fiber) => {
    getFiberId(fiber);
  };

  const visit = createFiberVisitor({
    onRender: handleFiber,
    onError(error) {
      console.error(error);
    },
  });

  instrument(
    secure(
      {
        onActive() {
          globalThis.__RST__ = true;
        },
        onCommitFiberRoot(rendererID, root) {
          fiberRoots.add(root);
          if (!hasInitedIds) {
            traverseFiber(root, handleFiber);
            hasInitedIds = true;
            return;
          }
          visit(rendererID, root);
        },
      },
      {
        dangerouslyRunInProduction: true,
        onError: (error) => {
          if (error) {
            console.error(error);
          }
        },
      },
    ),
  );

  let focusedElement: Element | null = null;
  let focusedFiber: Fiber | null = null;
  let text: string | null = null;

  const draw = async () => {
    if (!ctx) return;
    const currentElement = focusedElement;
    if (!currentElement) {
      clear();
      return false;
    }

    const elements = [currentElement];

    if (focusedFiber) {
      traverseFiber(focusedFiber, (fiber) => {
        if (isHostFiber(fiber)) {
          elements.push(fiber.stateNode);
        }
      });
    }

    const rectMap = await getRectMap(elements);
    const currentRect = rectMap.get(currentElement);
    if (!currentRect) return false;

    clear();

    let shouldContinueAnimating = false;
    const interpolatedX =
      prevX !== undefined ? lerp(prevX, currentRect.x) : currentRect.x;
    const interpolatedY =
      prevY !== undefined ? lerp(prevY, currentRect.y) : currentRect.y;

    if (
      prevX !== undefined &&
      (Math.abs(interpolatedX - currentRect.x) > 0.1 ||
        Math.abs(interpolatedY - currentRect.y) > 0.1)
    ) {
      shouldContinueAnimating = true;
    }

    for (const element of elements) {
      const rect = rectMap.get(element);
      if (!rect) continue;
      const { width, height } = rect;
      const x = element === currentElement ? interpolatedX : rect.x;
      const y = element === currentElement ? interpolatedY : rect.y;

      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.strokeStyle = `rgba(${primaryColor},0.5)`;
      if (currentElement === element) {
        ctx.fillStyle = `rgba(${primaryColor},0.1)`;
        ctx.strokeStyle = `rgba(${primaryColor})`;
        ctx.fill();
      }
      ctx.stroke();
    }

    if (text) {
      const { width: textWidth } = ctx.measureText(text);
      const textHeight = 11;
      ctx.textRendering = 'optimizeSpeed';
      ctx.font = '11px monospace';

      let labelY: number = interpolatedY - textHeight - 4;
      if (labelY < 0) {
        labelY = 0;
      }

      ctx.fillStyle = `rgba(${primaryColor})`;
      ctx.fillRect(interpolatedX, labelY, textWidth + 4, textHeight + 4);

      ctx.fillStyle = 'rgba(255,255,255)';
      ctx.fillText(text, interpolatedX + 2, labelY + textHeight);

      prevX = interpolatedX;
      prevY = interpolatedY;
    }

    return shouldContinueAnimating;
  };

  const animate = async () => {
    if (!isAnimating) return;
    const shouldContinue = await draw();
    if (shouldContinue) {
      requestAnimationFrame(animate);
    } else {
      isAnimating = false;
    }
  };

  const startAnimation = () => {
    if (!isAnimating) {
      isAnimating = true;
      requestAnimationFrame(animate);
    }
  };

  document.addEventListener('contextmenu', async (event) => {
    if (event.button !== 2) return;
    const target = event.target as Element;
    const fiber = getFiberFromHostInstance(event.target);
    if (fiber) {
      focusedFiber = fiber;
      const stack = getFiberStack(fiber);
      const displayNames = stack.map((fiber) => getDisplayName(fiber));
      const orderedDisplayNames: string[] = [];
      let count = 0;
      for (let i = displayNames.length - 1; i >= 0; i--) {
        const displayName = displayNames[i];
        if (displayName) {
          orderedDisplayNames.push(displayName);
          count++;
        }
        if (count > 2) break;
      }
      text = orderedDisplayNames.join(' > ');

      console.log('React Spec Tree:', await printRST(fiber, target));
    }

    focusedElement = target;
    startAnimation();
  });

  const clear = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  };

  const host = document.createElement('div');
  host.setAttribute('data-react-scan', 'true');
  const shadowRoot = host.attachShadow({ mode: 'open' });

  shadowRoot.innerHTML = CANVAS_HTML_STR;
  const canvas = shadowRoot.firstChild as HTMLCanvasElement;
  if (!canvas) return null;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const { innerWidth, innerHeight } = window;
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  const width = innerWidth * dpr;
  const height = innerHeight * dpr;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (ctx) {
    ctx.scale(dpr, dpr);
  }

  let isResizeScheduled = false;
  window.addEventListener('resize', () => {
    if (!isResizeScheduled) {
      isResizeScheduled = true;
      setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        dpr = getDpr();
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        if (ctx) {
          ctx.resetTransform();
          ctx.scale(dpr, dpr);
        }
        startAnimation();
        isResizeScheduled = false;
      });
    }
  });

  let isScrollScheduled = false;

  window.addEventListener('scroll', () => {
    if (!isScrollScheduled) {
      isScrollScheduled = true;
      setTimeout(() => {
        requestAnimationFrame(() => {
          startAnimation();
        });
        isScrollScheduled = false;
      }, 16 * 2);
    }
  });

  let prevFocusedElement: Element | null = null;
  setInterval(() => {
    if (prevFocusedElement === focusedElement) {
      return;
    }
    prevFocusedElement = focusedElement;
    startAnimation();
  }, 16 * 2);

  shadowRoot.appendChild(canvas);

  document.documentElement.appendChild(host);
};

init();

const semiSerialize = (value: unknown) => {
  if (
    ['undefined', 'null', 'number', 'boolean', 'string'].includes(typeof value)
  ) {
    return value;
  }
  if (typeof value === 'function') {
    return value.toString();
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return 'object';
    }
  }
  return 'unknown';
};

export const printRST = (
  fiber: Fiber,
  hoverElement: Element | null,
): Promise<PrintedReactSpecTree> => {
  const usedClasses = new Set<string>();
  const elements = new Set<Element>();

  // First pass - collect all elements and build the tree structure
  const createRSTNode = async (fiber: Fiber): Promise<ReactSpecNode> => {
    let node: ReactSpecNode;

    if (isCompositeFiber(fiber)) {
      const props: Record<string, unknown> = {};
      traverseProps(fiber, (key, value) => {
        props[key] = semiSerialize(value);
      });

      node = {
        type: ReactSpecNodeType.Component,
        children: [],
        props,
        name: getDisplayName(fiber),
      };
    } else if (isHostFiber(fiber)) {
      const className = fiber.memoizedProps.className;
      const classes: string[] = [];
      if (typeof className === 'string') {
        classes.push(...className.split(/\s+/));
        for (const cls of classes) {
          usedClasses.add(cls);
        }
      }

      const eventHandlers: Record<string, string> = {};
      const styles: Record<string, unknown> = {};

      traverseProps(fiber, (key, value) => {
        if (key.startsWith('on') && typeof value === 'function') {
          eventHandlers[key] = value.toString();
        }
      });

      if (fiber.stateNode) {
        elements.add(fiber.stateNode);
        const computedStyle = getComputedStyle(fiber.stateNode);
        for (let i = 0; i < computedStyle.length; i++) {
          const prop = computedStyle[i];
          styles[prop] = computedStyle.getPropertyValue(prop);
        }
      }

      node = {
        type: ReactSpecNodeType.Element,
        children: [],
        html: fiber.stateNode?.outerHTML || '',
        x: -1,
        y: -1,
        width: -1,
        height: -1,
        eventHandlers,
        classes,
        styles,
      };

      if (fiber.memoizedProps.role || fiber.memoizedProps['aria-label']) {
        node = {
          ...node,
          type: ReactSpecNodeType.A11y,
          role: (fiber.memoizedProps.role as string) || null,
          ariaLabel: (fiber.memoizedProps['aria-label'] as string) || null,
        };
      }
    } else {
      node = {
        type: ReactSpecNodeType.Component,
        children: [],
        props: {},
        name: null,
      };
    }

    // Traverse child and sibling fibers
    let child = fiber.child;
    while (child) {
      node.children.push(await createRSTNode(child));
      child = child.sibling;
    }

    return node;
  };

  // Start from the root fiber
  let root = fiber;
  while (root.return) {
    root = root.return;
  }

  // First create the tree
  return createRSTNode(root).then(async (tree) => {
    // Then batch get all rects
    const elementArray = Array.from(elements);
    const rectMap = await getRectMap(elementArray);

    // Update all nodes with their rects
    const updateRects = (node: ReactSpecNode) => {
      if (
        node.type === ReactSpecNodeType.Element ||
        node.type === ReactSpecNodeType.A11y
      ) {
        const element = elementArray.find((el) => el.outerHTML === node.html);
        if (element) {
          const rect = rectMap.get(element);
          if (rect) {
            node.x = rect.x;
            node.y = rect.y;
            node.width = rect.width;
            node.height = rect.height;
          }
        }
      }
      node.children.forEach(updateRects);
    };

    updateRects(tree);

    return {
      root: tree,
      html: hoverElement?.outerHTML || '',
    };
  });
};

export const getRectMap = (
  elements: Element[],
): Promise<Map<Element, DOMRect>> => {
  return new Promise((resolve) => {
    const rects = new Map<Element, DOMRect>();
    const observer = new IntersectionObserver((entries) => {
      for (let i = 0, len = entries.length; i < len; i++) {
        const entry = entries[i];
        const element = entry.target;
        const rect = entry.boundingClientRect;
        if (entry.isIntersecting && rect.width && rect.height) {
          rects.set(element, rect);
        }
      }
      observer.disconnect();
      resolve(rects);
    });

    for (let i = 0, len = elements.length; i < len; i++) {
      const element = elements[i];
      observer.observe(element);
    }
  });
};
