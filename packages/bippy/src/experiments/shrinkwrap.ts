import {
  getFiberFromHostInstance,
  instrument,
  isHostFiber,
  traverseFiber,
} from '../index.js';

const getDpr = () => {
  return Math.min(window.devicePixelRatio || 1, 2);
};

const CANVAS_HTML_STR = `<canvas style="position:fixed;top:0;left:0;pointer-events:none;z-index:2147483646" aria-hidden="true"></canvas>`;

const COLORS = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 165, 0],
  [128, 0, 128],
  [0, 128, 128],
  [255, 105, 180],
  [75, 0, 130],
  [255, 69, 0],
  [46, 139, 87],
  [220, 20, 60],
  [70, 130, 180],
];

const interactiveElements = [
  'a',
  'button',
  'details',
  'embed',
  'input',
  'label',
  'menu',
  'menuitem',
  'object',
  'select',
  'textarea',
  'summary',
];

const interactiveRoles = [
  'button',
  'menu',
  'menuitem',
  'link',
  'checkbox',
  'radio',
  'slider',
  'tab',
  'tabpanel',
  'textbox',
  'combobox',
  'grid',
  'listbox',
  'option',
  'progressbar',
  'scrollbar',
  'searchbox',
  'switch',
  'tree',
  'treeitem',
  'spinbutton',
  'tooltip',
  'a-button-inner',
  'a-dropdown-button',
  'click',
  'menuitemcheckbox',
  'menuitemradio',
  'a-button-text',
  'button-text',
  'button-icon',
  'button-icon-only',
  'button-text-icon-only',
  'dropdown',
  'combobox',
];

const interactiveEvents = [
  'click',
  'mousedown',
  'mouseup',
  'touchstart',
  'touchend',
  'keydown',
  'keyup',
  'focus',
  'blur',
];

export const isScrollable = (element: Element) => {
  const isScrollable =
    element.hasAttribute('aria-scrollable') ||
    element.hasAttribute('scrollable') ||
    ('style' in element &&
      ((element.style as CSSStyleDeclaration).overflow === 'auto' ||
        (element.style as CSSStyleDeclaration).overflow === 'scroll' ||
        (element.style as CSSStyleDeclaration).overflowY === 'auto' ||
        (element.style as CSSStyleDeclaration).overflowY === 'scroll' ||
        (element.style as CSSStyleDeclaration).overflowX === 'auto' ||
        (element.style as CSSStyleDeclaration).overflowX === 'scroll'));

  return isScrollable;
};

export const isInteractive = (element: Element) => {
  const fiber = getFiberFromHostInstance(element);

  if (fiber?.stateNode instanceof Element) {
    for (const propName of Object.keys(fiber.memoizedProps || {})) {
      if (!propName.startsWith('on')) continue;
      const event = propName
        .slice(2)
        .toLowerCase()
        .replace(/capture$/, '');
      if (!interactiveEvents.includes(event)) continue;
      if (fiber.memoizedProps[propName]) {
        return true;
      }
    }
  }

  for (const event of interactiveEvents) {
    const dotOnHandler = element[`on${event}` as keyof typeof element];
    const explicitOnHandler = element.hasAttribute(`on${event}`);
    const ngClick = element.hasAttribute(`ng-${event}`);
    const atClick = element.hasAttribute(`@${event}`);
    const vOnClick = element.hasAttribute(`v-on:${event}`);

    if (dotOnHandler || explicitOnHandler || ngClick || atClick || vOnClick) {
      return true;
    }
  }

  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const ariaRole = element.getAttribute('aria-role');
  const tabIndex = element.getAttribute('tabindex');

  const hasInteractiveRole =
    interactiveElements.includes(tagName) ||
    (role && interactiveRoles.includes(role)) ||
    (ariaRole && interactiveRoles.includes(ariaRole)) ||
    (tabIndex !== null && tabIndex !== '-1');

  const hasAriaProps =
    element.hasAttribute('aria-expanded') ||
    element.hasAttribute('aria-pressed') ||
    element.hasAttribute('aria-selected') ||
    element.hasAttribute('aria-checked');

  const isFormRelated =
    ('form' in element && element.form !== undefined) ||
    element.hasAttribute('contenteditable');

  const isDraggable =
    ('draggable' in element && element.draggable) ||
    element.getAttribute('draggable') === 'true';

  return hasInteractiveRole || isFormRelated || isDraggable || hasAriaProps;
};

const isElementVisible = (element: HTMLElement) => {
  const style = window.getComputedStyle(element);
  return (
    element.offsetWidth > 0 &&
    element.offsetHeight > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
  );
};

const isTopElement = (element: HTMLElement) => {
  const doc = element.ownerDocument;

  if (doc !== window.document) {
    return true;
  }

  const shadowRoot = element.getRootNode();
  if (shadowRoot instanceof ShadowRoot) {
    const rect = element.getBoundingClientRect();
    const point = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    try {
      const topEl = shadowRoot.elementFromPoint(point.x, point.y) as
        | Element
        | ShadowRoot
        | null;
      if (!topEl) return false;

      let current: Element | ShadowRoot | null = topEl;
      while (current && current !== shadowRoot) {
        if (current === element) return true;
        current = current.parentElement;
      }
      return false;
    } catch {
      return true;
    }
  }

  const rect = element.getBoundingClientRect();

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const viewportTop = scrollY;
  const viewportLeft = scrollX;
  const viewportBottom = window.innerHeight + scrollY;
  const viewportRight = window.innerWidth + scrollX;

  const absTop = rect.top + scrollY;
  const absLeft = rect.left + scrollX;
  const absBottom = rect.bottom + scrollY;
  const absRight = rect.right + scrollX;

  if (
    absBottom < viewportTop ||
    absTop > viewportBottom ||
    absRight < viewportLeft ||
    absLeft > viewportRight
  ) {
    return false;
  }

  try {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const point = {
      x: centerX,
      y: centerY,
    };

    if (
      point.x < 0 ||
      point.x >= window.innerWidth ||
      point.y < 0 ||
      point.y >= window.innerHeight
    ) {
      return true;
    }

    const topEl = document.elementFromPoint(point.x, point.y);
    if (!topEl) return false;

    let current: Element | null = topEl;
    while (current && current !== document.documentElement) {
      if (current === element) return true;
      current = current.parentElement;
    }
    return false;
  } catch {
    return true;
  }
};

export const createExtractor = () => {
  let elements: Element[] = [];
  const draw = async () => {
    if (!ctx) return;

    const rectMap = await getRectMap(elements);
    clear();

    const drawnLabelBounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    let visibleCount = 0;
    const visibleIndices = new Map<Element, number>();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const COVERAGE_THRESHOLD = 0.97;

    for (let i = 0, len = elements.length; i < len; i++) {
      const element = elements[i];
      const rect = rectMap.get(element);
      if (!rect) continue;

      const { width, height } = rect;
      const x = rect.x;
      const y = rect.y;

      if (
        width / viewportWidth > COVERAGE_THRESHOLD &&
        height / viewportHeight > COVERAGE_THRESHOLD
      )
        continue;

      const text = `${visibleCount + 1}`;
      const textSize = 16;
      ctx.textRendering = 'optimizeSpeed';
      ctx.font = `${textSize}px monospace`;
      const { width: textWidth } = ctx.measureText(text);

      let labelY: number = y - textSize - 4;
      if (labelY < 0) {
        labelY = 0;
      }

      const labelBounds = {
        x,
        y: labelY,
        width: textWidth + 4,
        height: textSize + 4,
      };

      const hasCollision = drawnLabelBounds.some(
        (bound) =>
          labelBounds.x < bound.x + bound.width &&
          labelBounds.x + labelBounds.width > bound.x &&
          labelBounds.y < bound.y + bound.height &&
          labelBounds.y + labelBounds.height > bound.y,
      );

      if (!hasCollision) {
        drawnLabelBounds.push(labelBounds);
        visibleCount++;
        visibleIndices.set(element, visibleCount);

        // Draw outline
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        const color = COLORS[i % COLORS.length].join(',');
        ctx.fillStyle = `rgba(${color},0.1)`;
        ctx.strokeStyle = `rgba(${color})`;
        ctx.fill();
        ctx.stroke();

        // Draw label
        ctx.fillStyle = `rgba(${color})`;
        ctx.fillRect(x, labelY, textWidth + 4, textSize + 4);
        ctx.fillStyle = 'rgba(255,255,255)';
        ctx.fillText(text, x + 2, labelY + textSize);
      }
    }

    return visibleIndices;
  };

  const clear = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  };

  const host = document.createElement('div');
  host.setAttribute('data-react-scan', 'true');
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = CANVAS_HTML_STR;
  const canvas = root.firstChild as HTMLCanvasElement;

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
        draw();
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
          draw();
        });
        isScrollScheduled = false;
      }, 16 * 2);
    }
  });

  root.appendChild(canvas);

  document.documentElement.appendChild(host);

  const extractor = {
    draw(newElements: Element[]) {
      elements = newElements;
      draw().then((visibleIndices) => {
        if (!visibleIndices) return;
        const textContentMap: Record<number, string> = {};
        visibleIndices.forEach((index, element) => {
          textContentMap[index] = element.textContent || '';
        });
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        (window as any).shrinkwrap = textContentMap;
      });
    },
    drawInteractive() {
      instrument({
        onCommitFiberRoot(_, root) {
          const elements: Element[] = [];
          traverseFiber(root.current, (fiber) => {
            if (
              isHostFiber(fiber) &&
              isInteractive(fiber.stateNode) &&
              isElementVisible(fiber.stateNode) &&
              isTopElement(fiber.stateNode)
            ) {
              elements.push(fiber.stateNode);
            }
          });
          extractor.draw(elements);
        },
      });
    },
  };

  return extractor;
};

setTimeout(() => {
  const extractor = createExtractor();
  extractor.drawInteractive();
}, 1000);

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
