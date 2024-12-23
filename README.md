> [!WARNING]
> ⚠️⚠️⚠️ **this project may break production apps and cause unexpected behavior** ⚠️⚠️⚠️
>
> this project uses react internals, which can change at any time. it is not recommended to depend on internals unless you really, _really_ have to. by proceeding, you acknowledge the risk of breaking your own code or apps that use your code.

# <img src="https://github.com/aidenybai/bippy/blob/main/.github/assets/bippy.png?raw=true" width="60" align="center" /> bippy

[![size](https://img.shields.io/bundlephobia/minzip/bippy?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/bippy)
[![version](https://img.shields.io/npm/v/bippy?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/bippy)
[![downloads](https://img.shields.io/npm/dt/bippy.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/bippy)

a hacky way to get fibers from react. <small>used internally by [`react-scan`](https://github.com/aidenybai/react-scan)</small>

bippy _attempts\*_ to solve two problems:

1. it's not possible to write instrumentation for React without the end user changing code
2. doing anything useful with fibers requires you to know react source code very well

bippy allows you to access fiber information from outside of react and provides friendly low-level utils for interacting with fibers.

<sub><sup>\*disclaimer: "attempt" used loosely, i highly recommend not relying on this in production</sub></sup>

## how it works

bippy works by monkey-patching `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` with [custom handlers](https://github.com/facebook/react/blob/6907aa2a309bdc47dc3504683159cb50b590eed8/packages/react-reconciler/src/ReactFiberDevToolsHook.js#L112). this gives us access to react internals without needing to use react devtools.

[`react-scan`](https://github.com/aidenybai/react-scan) is a tool that highlights renders in your react app. under the hood, it uses bippy to detect rendered fibers.

fibers are how "work" is represented in react. each fiber either represents a composite (function/class component) or a host (dom element). [here is a live visualization](https://jser.pro/ddir/rie?reactVersion=18.3.1&snippetKey=hq8jm2ylzb9u8eh468) of what the fiber tree looks like, and here is a [deep dive article](https://jser.dev/2023-07-18-how-react-rerenders/).

a simplified version of a fiber looks roughly like this:

```typescript
interface Fiber {
  // component type (function/class)
  type: any;

  child: Fiber | null;
  sibling: Fiber | null;

  // stateNode is the host fiber (e.g. DOM element)
  stateNode: Node | null;

  // parent fiber
  return: Fiber | null;

  // saved props input
  memoizedProps: any;

  // state (useState, useReducer, useSES, etc.)
  memoizedState: any;

  // contexts (useContext)
  dependencies: Dependencies | null;

  // effects (useEffect, useLayoutEffect, etc.)
  updateQueue: any;
}
```

however, fibers aren't directly accessible by the user. so, we have to hack our way around to accessing it.

luckily, react [reads from a property](https://github.com/facebook/react/blob/6a4b46cd70d2672bc4be59dcb5b8dede22ed0cef/packages/react-reconciler/src/ReactFiberDevToolsHook.js#L48) in the window object: `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` and runs handlers on it when certain events happen. this property must exist before react's bundle is executed. this is intended for react devtools, but we can use it to our advantage.

here's what it roughly looks like:

```typescript
interface __REACT_DEVTOOLS_GLOBAL_HOOK__ {
  // list of renderers (react-dom, react-native, etc.)
  renderers: Map<RendererID, ReactRenderer>;

  // called when react has rendered everythign and ready to apply
  // changes to the host tree (e.g. DOM mutations)
  onCommitFiberRoot: (
    rendererID: RendererID,
    fiber: Record<string, unknown>,
    commitPriority?: number,
    didError?: boolean
  ) => void;
}
```

we can use bippy's utils and the `onCommitFiberRoot` handler to detect renders!

## example

here's a mini toy version of [`react-scan`](https://github.com/aidenybai/react-scan) that highlights renders in your app.

first, install bippy:

```bash
npm install bippy
```

then, use the `instrument` function to set up the hook:

```javascript
import {
  instrument,
  isHostFiber,
  getNearestHostFiber,
  createFiberVisitor,
} from 'bippy'; // must be imported BEFORE react

const highlightFiber = (fiber) => {
  if (!(fiber.stateNode instanceof HTMLElement)) return;
  // fiber.stateNode is a DOM element
  const rect = fiber.stateNode.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.style.border = '1px solid red';
  highlight.style.position = 'fixed';
  highlight.style.top = `${rect.top}px`;
  highlight.style.left = `${rect.left}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
  highlight.style.zIndex = 999999999;
  document.documentElement.appendChild(highlight);
  setTimeout(() => {
    document.documentElement.removeChild(highlight);
  }, 100);
};

/**
 * `createFiberVisitor` traverses the fiber tree and determines which
 * fibers have actually rendered.
 *
 * A fiber tree contains many fibers that may have not rendered. this
 * can be because it bailed out (e.g. `useMemo`) or because it wasn't
 * actually rendered (if <Child> re-rendered, then <Parent> didn't
 * actually render, but exists in the fiber tree).
 */
const visit = createFiberVisitor({
  onRender(fiber) {
    /**
     * `getNearestHostFiber` is a utility function that finds the
     * nearest host fiber to a given fiber.
     *
     * a host fiber for `react-dom` is a fiber that has a DOM element
     * as its `stateNode`.
     */
    const hostFiber = getNearestHostFiber(fiber);
    highlightFiber(hostFiber);
  },
});

/**
 * `instrument` is a function that installs the React DevTools global
 * hook and allows you to set up custom handlers for React fiber events.
 */
instrument(
  /**
   * `secure` is a function that wraps your handlers in a try/catch
   * and prevents it from crashing the app. it also prevents it from
   * running on unsupported React versions and during production.
   *
   * this is not required but highly recommended to provide "safeguards"
   * in case something breaks.
   */
  secure({
    /**
     * `onCommitFiberRoot` is a handler that is called when React is
     * ready to commit a fiber root. this means that React is has
     * rendered your entire app and is ready to apply changes to
     * the host tree (e.g. via DOM mutations).
     */
    onCommitFiberRoot(rendererID, root) {
      visit(rendererID, root);
    },
  })
);
```

## misc

the original bippy character is owned and created by [@dairyfreerice](https://www.instagram.com/dairyfreerice). this project is not related to the bippy brand, i just think the character is cute.
