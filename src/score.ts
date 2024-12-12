import type { Fiber } from 'react-reconciler';
import {
  didFiberCommit,
  getMutatedHostFibers,
  getNearestHostFiber,
} from './index';

let fps = 0;
let lastTime = performance.now();
let frameCount = 0;
let inited = false;

export const getFPS = () => {
  const updateFPS = () => {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(updateFPS);
  };

  if (!inited) {
    inited = true;
    updateFPS();
  }

  return fps;
};

const truncateFloat = (value: number, maxLen = 10000 /* 4 digits */) => {
  if (
    typeof value === 'number' &&
    parseInt(value as any) !== value /* float check */
  ) {
    value = ~~(value * maxLen) / maxLen;
  }
  return value;
};

const THRESHOLD_FPS = 60;

export const getFiberRenderScore = (fiber: Fiber) => {
  const hostFiber = getNearestHostFiber(fiber);
  const hasMutation = didFiberCommit(fiber);
  const mutatedHostFibers = getMutatedHostFibers(fiber);
  const isVisible =
    hostFiber &&
    isElementVisible(hostFiber.stateNode) &&
    isElementInViewport(hostFiber.stateNode);
  const fps = getFPS();

  let unnecessaryScore =
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    isVisible || mutatedHostFibers.length || hasMutation ? 0 : 1;
  for (const mutatedHostFiber of mutatedHostFibers) {
    const node = mutatedHostFiber.stateNode;
    if (!isElementVisible(node) || !isElementInViewport(node)) {
      unnecessaryScore += 1 / mutatedHostFibers.length;
    }
  }

  return {
    unnecessary: truncateFloat(unnecessaryScore),
    slow:
      fps < THRESHOLD_FPS
        ? truncateFloat((THRESHOLD_FPS - fps) / THRESHOLD_FPS)
        : 0,
  };
};

export const isElementVisible = (el: HTMLElement) => {
  const style = window.getComputedStyle(el);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.contentVisibility !== 'hidden' &&
    style.opacity !== '0'
  );
};

let initedEventListeners = false;
let scrollX: number | null = null;
let scrollY: number | null = null;
let innerWidth: number | null = null;
let innerHeight: number | null = null;

export const getWindowDimensions = () => {
  if (scrollX === null) scrollX = window.scrollX;
  if (scrollY === null) scrollY = window.scrollY;
  if (innerWidth === null) innerWidth = window.innerWidth;
  if (innerHeight === null) innerHeight = window.innerHeight;

  if (!initedEventListeners) {
    initedEventListeners = true;
    const handleResize = () => {
      scrollX = null;
      scrollY = null;
      innerWidth = null;
      innerHeight = null;
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
  }
  return {
    top: scrollY,
    left: scrollX,
    right: scrollX + innerWidth,
    bottom: scrollY + innerHeight,
  };
};

export const isElementInViewport = (el: HTMLElement) => {
  const elTop = el.offsetTop;
  const elLeft = el.offsetLeft;
  const elWidth = el.offsetWidth;
  const elHeight = el.offsetHeight;
  const { top, left, right, bottom } = getWindowDimensions();

  return (
    elTop + elHeight > top &&
    elLeft + elWidth > left &&
    elTop < bottom &&
    elLeft < right
  );
};
