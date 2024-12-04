// Note: do not import React in this file
// since it will be executed before the react devtools hook is created

import type * as React from 'react';
import type { Fiber, FiberRoot } from 'react-reconciler';

export const PerformedWorkFlag = 0b01;
export const ClassComponentTag = 1;
export const FunctionComponentTag = 0;
export const ContextConsumerTag = 9;
export const ForwardRefTag = 11;
export const MemoComponentTag = 14;
export const SimpleMemoComponentTag = 15;
export const HostComponentTag = 5;
export const HostHoistableTag = 26;
export const HostSingletonTag = 27;
export const DehydratedSuspenseComponent = 18;
export const HostText = 6;
export const Fragment = 7;
export const LegacyHiddenComponent = 23;
export const OffscreenComponent = 22;
export const HostRoot = 3;
export const CONCURRENT_MODE_NUMBER = 0xeacf;
export const CONCURRENT_MODE_SYMBOL_STRING = 'Symbol(react.concurrent_mode)';
export const DEPRECATED_ASYNC_MODE_SYMBOL_STRING = 'Symbol(react.async_mode)';

export const traverseContexts = (
  fiber: Fiber,
  selector: (
    prevValue: { context: React.Context<unknown>; memoizedValue: unknown },
    nextValue: { context: React.Context<unknown>; memoizedValue: unknown },
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ) => boolean | void,
) => {
  const nextDependencies = fiber.dependencies;
  const prevDependencies = fiber.alternate?.dependencies;

  if (!nextDependencies || !prevDependencies) return false;
  if (
    typeof nextDependencies !== 'object' ||
    !('firstContext' in nextDependencies) ||
    typeof prevDependencies !== 'object' ||
    !('firstContext' in prevDependencies)
  ) {
    return false;
  }
  let nextContext = nextDependencies.firstContext;
  let prevContext = prevDependencies.firstContext;
  while (
    nextContext &&
    typeof nextContext === 'object' &&
    'memoizedValue' in nextContext &&
    prevContext &&
    typeof prevContext === 'object' &&
    'memoizedValue' in prevContext
  ) {
    if (selector(nextContext as any, prevContext as any) === true) return true;

    nextContext = nextContext.next;
    prevContext = prevContext.next;
  }
  return false;
};

export const traverseState = (
  fiber: Fiber,
  selector: (
    prevValue: { memoizedState: unknown },
    nextValue: { memoizedState: unknown },
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ) => boolean | void,
) => {
  let prevState = fiber.memoizedState;
  let nextState = fiber.alternate?.memoizedState;

  while (prevState && nextState) {
    if (selector(prevState, nextState) === true) return true;

    prevState = prevState.next;
    nextState = nextState.next;
  }

  return false;
};

export const isHostComponent = (fiber: Fiber) =>
  fiber.tag === HostComponentTag ||
  // @ts-expect-error: it exists
  fiber.tag === HostHoistableTag ||
  // @ts-expect-error: it exists
  fiber.tag === HostSingletonTag;

// Composite components are components that are not host components.
// https://github.com/facebook/react/blob/865d2c418d5ba6fb4546e4b58616cd9b7701af85/packages/react/src/jsx/ReactJSXElement.js#L490
export const isCompositeComponent = (fiber: Fiber) => {
  return (
    fiber.tag === FunctionComponentTag ||
    fiber.tag === ClassComponentTag ||
    fiber.tag === SimpleMemoComponentTag ||
    fiber.tag === MemoComponentTag ||
    fiber.tag === ForwardRefTag
  );
};

export const didFiberRender = (fiber: Fiber): boolean => {
  const nextProps = fiber.memoizedProps;
  const prevProps = fiber.alternate?.memoizedProps || {};
  const flags = fiber.flags ?? (fiber as any).effectTag ?? 0;

  switch (fiber.tag) {
    case ClassComponentTag:
    case FunctionComponentTag:
    case ContextConsumerTag:
    case ForwardRefTag:
    case MemoComponentTag:
    case SimpleMemoComponentTag: {
      return (flags & PerformedWorkFlag) === PerformedWorkFlag;
    }
    default:
      // Host nodes (DOM, root, etc.)
      if (!fiber.alternate) return true;
      return (
        prevProps !== nextProps ||
        fiber.alternate.memoizedState !== fiber.memoizedState ||
        fiber.alternate.ref !== fiber.ref
      );
  }
};

export const shouldFilterFiber = (fiber: Fiber) => {
  switch (fiber.tag) {
    case DehydratedSuspenseComponent:
      // TODO: ideally we would show dehydrated Suspense immediately.
      // However, it has some special behavior (like disconnecting
      // an alternate and turning into real Suspense) which breaks DevTools.
      // For now, ignore it, and only show it once it gets hydrated.
      // https://github.com/bvaughn/react-devtools-experimental/issues/197
      return true;

    case HostText:
    case Fragment:
    case LegacyHiddenComponent:
    case OffscreenComponent:
      return true;

    case HostRoot:
      // It is never valid to filter the root element.
      return false;

    default: {
      const symbolOrNumber =
        typeof fiber.type === 'object' && fiber.type !== null
          ? fiber.type.$$typeof
          : fiber.type;

      const typeSymbol =
        typeof symbolOrNumber === 'symbol'
          ? symbolOrNumber.toString()
          : symbolOrNumber;

      switch (typeSymbol) {
        case CONCURRENT_MODE_NUMBER:
        case CONCURRENT_MODE_SYMBOL_STRING:
        case DEPRECATED_ASYNC_MODE_SYMBOL_STRING:
          return true;

        default:
          return false;
      }
    }
  }
};

export const getNearestHostFiber = (fiber: Fiber) => {
  let hostFiber = traverseFiber(fiber, isHostComponent);
  if (!hostFiber) {
    hostFiber = traverseFiber(fiber, isHostComponent, true);
  }
  return hostFiber;
};

export const traverseFiber = (
  fiber: Fiber | null,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  selector: (node: Fiber) => boolean | void,
  ascending = false,
): Fiber | null => {
  if (!fiber) return null;
  if (selector(fiber) === true) return fiber;

  let child = ascending ? fiber.return : fiber.child;
  while (child) {
    const match = traverseFiber(child, selector, ascending);
    if (match) return match;

    child = ascending ? null : child.sibling;
  }
  return null;
};

export const getTimings = (fiber?: Fiber | null | undefined) => {
  const totalTime = fiber?.actualDuration ?? 0;
  let selfTime = totalTime;
  // TODO: calculate a DOM time, which is just host component summed up
  let child = fiber?.child ?? null;
  // eslint-disable-next-line eqeqeq
  while (totalTime > 0 && child != null) {
    selfTime -= child.actualDuration ?? 0;
    child = child.sibling;
  }
  return { selfTime, totalTime };
};

export const getFiberFromElement = (element: HTMLElement): Fiber | null => {
  const { renderers } = getRDTHook();
  if (!renderers) return null;
  for (const [_, renderer] of Array.from(renderers)) {
    try {
      const fiber = renderer.findFiberByHostInstance(element);
      if (fiber) return fiber;
    } catch (e) {
      // If React is mid-render, references to previous nodes may disappear
    }
  }

  if ('_reactRootContainer' in element) {
    // @ts-expect-error - Property '_reactRootContainer' does not exist on type 'HTMLElement'
    return element._reactRootContainer?._internalRoot?.current?.child;
  }

  for (const key in element) {
    if (
      key.startsWith('__reactInternalInstance$') ||
      key.startsWith('__reactFiber')
    ) {
      return element[key as keyof HTMLElement] as unknown as Fiber;
    }
  }
  return null;
};

export const hasMemoCache = (fiber: Fiber) => {
  return Boolean((fiber.updateQueue as any)?.memoCache);
};

const NO_OP = () => {
  /**/
};

export const getRDTHook = () => {
  let rdtHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const renderers = new Map();
  let i = 0;
  rdtHook ??= {
    checkDCE: NO_OP,
    supportsFiber: true,
    supportsFlight: true,
    renderers,
    onCommitFiberRoot: NO_OP,
    onCommitFiberUnmount: NO_OP,
    onPostCommitFiberRoot: NO_OP,
    inject(renderer) {
      const nextID = ++i;
      renderers.set(nextID, renderer);
      return nextID;
    },
  };
  globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = rdtHook;
  return rdtHook;
};

// __REACT_DEVTOOLS_GLOBAL_HOOK__ must exist before React is ever executed
// this is the case with the React Devtools extension, but without it, we need
if (typeof window !== 'undefined') {
  getRDTHook();
}

export const traverseFiberRoot = ({
  onRender,
}: {
  onRender: (fiber: Fiber) => void;
}) => {
  return (_rendererID: number, root: FiberRoot) => {
    const rootFiber = root.current;
    const wasMounted =
      rootFiber.alternate !== null &&
      Boolean(rootFiber.alternate.memoizedState?.element) &&
      // A dehydrated root is not considered mounted
      rootFiber.alternate.memoizedState.isDehydrated !== true;
    const isMounted = Boolean(rootFiber.memoizedState?.element);

    const mountFiber = (firstChild: Fiber, traverseSiblings: boolean) => {
      let fiber: Fiber | null = firstChild;

      // eslint-disable-next-line eqeqeq
      while (fiber != null) {
        const shouldIncludeInTree = !shouldFilterFiber(fiber);
        if (shouldIncludeInTree && didFiberRender(fiber)) {
          onRender(fiber);
        }

        // eslint-disable-next-line eqeqeq
        if (fiber.child != null) {
          mountFiber(fiber.child, true);
        }
        fiber = traverseSiblings ? fiber.sibling : null;
      }
    };

    const updateFiber = (nextFiber: Fiber, prevFiber: Fiber) => {
      if (!prevFiber) return;

      const shouldIncludeInTree = !shouldFilterFiber(nextFiber);
      if (shouldIncludeInTree && didFiberRender(nextFiber)) {
        onRender(nextFiber);
      }

      if (nextFiber.child !== prevFiber.child) {
        let nextChild = nextFiber.child;

        while (nextChild) {
          const prevChild = nextChild.alternate;
          if (prevChild) {
            updateFiber(nextChild, prevChild);
          } else {
            mountFiber(nextChild, false);
          }

          nextChild = nextChild.sibling;
        }
      }
    };

    if (!wasMounted && isMounted) {
      mountFiber(rootFiber, false);
    } else if (wasMounted && isMounted) {
      updateFiber(rootFiber, rootFiber.alternate);
    }
  };
};

export const instrument = ({
  onCommitFiberRoot,
  onCommitFiberUnmount,
  onPostCommitFiberRoot,
}: {
  onCommitFiberRoot?: (rendererID: number, root: FiberRoot) => void;
  onCommitFiberUnmount?: (rendererID: number, root: FiberRoot) => void;
  onPostCommitFiberRoot?: (rendererID: number, root: FiberRoot) => void;
}) => {
  const devtoolsHook = getRDTHook();

  const prevOnCommitFiberRoot = devtoolsHook.onCommitFiberRoot;
  if (onCommitFiberRoot) {
    devtoolsHook.onCommitFiberRoot = (rendererID: number, root: FiberRoot) => {
      if (prevOnCommitFiberRoot) prevOnCommitFiberRoot(rendererID, root);
      onCommitFiberRoot(rendererID, root);
    };
  }

  const prevOnCommitFiberUnmount = devtoolsHook.onCommitFiberUnmount;
  if (onCommitFiberUnmount) {
    devtoolsHook.onCommitFiberUnmount = (
      rendererID: number,
      root: FiberRoot,
    ) => {
      if (prevOnCommitFiberUnmount) prevOnCommitFiberUnmount(rendererID, root);
      onCommitFiberUnmount(rendererID, root);
    };
  }

  const prevOnPostCommitFiberRoot = devtoolsHook.onPostCommitFiberRoot;
  if (onPostCommitFiberRoot) {
    devtoolsHook.onPostCommitFiberRoot = (
      rendererID: number,
      root: FiberRoot,
    ) => {
      if (prevOnPostCommitFiberRoot) {
        prevOnPostCommitFiberRoot(rendererID, root);
      }
    };
  }

  return devtoolsHook;
};
