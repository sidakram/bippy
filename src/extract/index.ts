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
  getNearestHostFiber,
} from '../index.js';

export interface ReactSpecTree {
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
  classes: string[];
  styles: Record<string, unknown>;
  element: Element | null;
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

    focusedElement = target;
    if (fiber) {
      focusedFiber = fiber;
      const stack = getFiberStack(fiber);
      const displayNames = stack.map((fiber) => getDisplayName(fiber));
      const orderedDisplayNames: string[] = [];
      let count = 0;

      let nearestCompositeFiber: Fiber | null = null;
      let currentFiber: Fiber | null = fiber;
      while (currentFiber) {
        if (isCompositeFiber(currentFiber)) {
          nearestCompositeFiber = currentFiber;
          break;
        }
        currentFiber = currentFiber.return;
      }

      for (let i = displayNames.length - 1; i >= 0; i--) {
        const displayName = displayNames[i];
        if (displayName) {
          orderedDisplayNames.push(displayName);
          count++;
        }
        if (count > 2) break;
      }
      text = orderedDisplayNames.join(' > ');
      const rst = await createRSTWithFiber(
        nearestCompositeFiber || fiber,
        target,
      );
      // console.log(printRST(rst));
      console.log(rst);
    } else {
      focusedFiber = null;
      text = target.tagName.toLowerCase();
      const rst = await createRSTWithElement(target);
      // console.log(printRST(rst));
      console.log(rst);
    }

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

const createRSTWithFiber = async (
  fiber: Fiber,
  element: Element,
): Promise<ReactSpecTree> => {
  const root = await createRSTNode(fiber, element);
  return { root };
};

const createRSTWithElement = async (
  element: Element,
): Promise<ReactSpecTree> => {
  const root = await createRSTNodeFromElement(element);
  return { root };
};

const createElementNode = async (
  element: Element,
): Promise<ReactElementSpecNode> => {
  const rectMap = await getRectMap([element]);
  const rect = rectMap.get(element) || element.getBoundingClientRect();

  const computedStyle = window.getComputedStyle(element);
  const styles: Record<string, unknown> = {};
  Array.from({ length: computedStyle.length }).forEach((_, i) => {
    const prop = computedStyle[i];
    styles[prop] = computedStyle.getPropertyValue(prop);
  });

  return {
    type: ReactSpecNodeType.Element,
    children: [],
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    eventHandlers: {},
    classes: Array.from(element.classList),
    styles,
    element,
  };
};

const createA11yNode = (
  base: ReactElementSpecNode,
  role: string | null,
  ariaLabel: string | null,
): ReactA11ySpecNode => {
  return {
    ...base,
    type: ReactSpecNodeType.A11y,
    role,
    ariaLabel,
  };
};

const createRSTNodeFromElement = async (
  element: Element,
): Promise<ReactSpecNode> => {
  const base = await createElementNode(element);

  for (const attr of Array.from(element.attributes)) {
    if (attr.name.startsWith('on')) {
      base.eventHandlers[attr.name] = attr.value;
    }
  }

  base.children = await Promise.all(
    Array.from(element.children).map(createRSTNodeFromElement),
  );

  const role = element.getAttribute('role');
  const ariaLabel = element.getAttribute('aria-label');

  if (role || ariaLabel) {
    return createA11yNode(base, role, ariaLabel);
  }

  return base;
};

const createRSTNode = async (
  fiber: Fiber,
  element: Element,
): Promise<ReactSpecNode> => {
  if (isCompositeFiber(fiber)) {
    const props: Record<string, unknown> = {};
    traverseProps(fiber, (propName, nextValue) => {
      props[propName] = nextValue;
    });

    const children: ReactSpecNode[] = [];
    const childPromises: Promise<void>[] = [];

    traverseFiber(fiber.child, (childFiber) => {
      if (isHostFiber(childFiber) && childFiber.stateNode) {
        childPromises.push(
          createRSTNode(childFiber, childFiber.stateNode).then((node) => {
            children.push(node);
          }),
        );
      } else if (isCompositeFiber(childFiber)) {
        const hostFiber = getNearestHostFiber(childFiber);
        if (hostFiber?.stateNode) {
          childPromises.push(
            createRSTNode(childFiber, hostFiber.stateNode).then((node) => {
              children.push(node);
            }),
          );
        }
      }
    });

    await Promise.all(childPromises);

    return {
      type: ReactSpecNodeType.Component,
      children,
      props,
      name: getDisplayName(fiber.type),
    };
  }

  if (isHostFiber(fiber)) {
    const base = await createElementNode(element);

    traverseProps(fiber, (propName, value) => {
      if (propName.startsWith('on') && typeof value === 'function') {
        base.eventHandlers[propName] = value.toString();
      }
    });

    base.children = [];
    const childPromises: Promise<void>[] = [];

    traverseFiber(fiber.child, (childFiber) => {
      if (isHostFiber(childFiber) && childFiber.stateNode) {
        childPromises.push(
          createRSTNode(childFiber, childFiber.stateNode).then((node) => {
            base.children.push(node);
          }),
        );
      } else if (isCompositeFiber(childFiber)) {
        const hostFiber = getNearestHostFiber(childFiber);
        if (hostFiber?.stateNode) {
          childPromises.push(
            createRSTNode(childFiber, hostFiber.stateNode).then((node) => {
              base.children.push(node);
            }),
          );
        }
      }
    });

    await Promise.all(childPromises);

    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');

    if (role || ariaLabel) {
      return createA11yNode(base, role, ariaLabel);
    }

    return base;
  }

  throw new Error('Unknown fiber type');
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

const stringifyWithCircularCheck = (
  value: unknown,
  seen = new WeakSet(),
): string => {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === 'function') {
    return (
      value.toString().slice(0, 50) +
      (value.toString().length > 50 ? '...' : '')
    );
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const items = value.map((item) => stringifyWithCircularCheck(item, seen));
    return `[${items.join(', ')}]`;
  }

  try {
    const pairs = Object.entries(value).map(
      ([key, val]) => `${key}: ${stringifyWithCircularCheck(val, seen)}`,
    );
    return `{${pairs.join(', ')}}`;
  } catch {
    return '[Object]';
  }
};

export const printRST = (tree: ReactSpecTree, indent = 0): string => {
  const printNode = (node: ReactSpecNode, indent: number): string => {
    const spaces = '  '.repeat(indent);

    if (
      node.type === ReactSpecNodeType.Component &&
      'props' in node &&
      'name' in node
    ) {
      const props = Object.entries(node.props)
        .map(([key, value]) => `${key}={${stringifyWithCircularCheck(value)}}`)
        .join(' ');
      return `${spaces}<${node.name || 'Unknown'}${props ? ` ${props}` : ''}>\n${node.children
        .map((child) => printNode(child, indent + 1))
        .join('\n')}\n${spaces}</${node.name || 'Unknown'}>`;
    }

    const attrs: string[] = [];
    if ('classes' in node && node.classes.length > 0) {
      attrs.push(`class="${node.classes.join(' ')}"`);
    }

    if ('eventHandlers' in node) {
      const eventHandlerAttrs = Object.entries(node.eventHandlers)
        .map(
          ([event, handler]) =>
            `${event}={${handler.slice(0, 50)}${handler.length > 50 ? '...' : ''}}`,
        )
        .join(' ');
      if (eventHandlerAttrs) {
        attrs.push(eventHandlerAttrs);
      }
    }

    if ('styles' in node) {
      const styleStr = stringifyWithCircularCheck(node.styles);
      if (styleStr !== '{}') {
        attrs.push(`style={${styleStr}}`);
      }
    }

    if (
      node.type === ReactSpecNodeType.A11y &&
      'role' in node &&
      'ariaLabel' in node
    ) {
      if (node.role) attrs.push(`role="${node.role}"`);
      if (node.ariaLabel) attrs.push(`aria-label="${node.ariaLabel}"`);
    }

    if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
      const dimensions = `x=${Math.round(node.x)} y=${Math.round(node.y)} w=${Math.round(node.width)} h=${Math.round(node.height)}`;
      attrs.push(dimensions);
    }

    const tagName =
      'element' in node
        ? node.element?.tagName.toLowerCase() || 'unknown'
        : 'unknown';
    const attrsStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';

    if (node.children.length === 0) {
      return `${spaces}<${tagName}${attrsStr} />`;
    }

    return `${spaces}<${tagName}${attrsStr}>\n${node.children
      .map((child) => printNode(child, indent + 1))
      .join('\n')}\n${spaces}</${tagName}>`;
  };

  if (!('type' in tree.root)) {
    throw new Error('Invalid RST: root node must have a type');
  }

  return printNode(tree.root as ReactSpecNode, indent);
};
