# <img src="https://github.com/aidenybai/bippy/blob/main/.github/assets/bippy.png?raw=true" width="60" align="center" /> bippy

[![Size](https://img.shields.io/bundlephobia/minzip/bippy?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/bippy)
[![Version](https://img.shields.io/npm/v/bippy?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/bippy)
[![Downloads](https://img.shields.io/npm/dt/bippy.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/bippy)

a hacky way to get fibers from react. <small>used internally by [`react-scan`](https://github.com/aidenybai/react-scan)</small>

bippy attempts to solve two problems:

1. it's not possible to write instrumentation software without the end user changing code

→ **bippy allows you to access fiber information from outside of react**

2. fiber data structure can change and require you to know react source code well

→ **bippy provides friendly low-level utils for interacting with fibers**

> [!WARNING]
> ⚠️⚠️⚠️ **bippy may break production apps and cause unexpected behavior** ⚠️⚠️⚠️
>
> this project uses react internals, which can change at any time. it is not recommended to depend on internals unless you really, _really_ have to. the risk of breaking your own code or app is non-zero.

## how it works

bippy works by monkey-patching `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` with [custom handlers](https://github.com/facebook/react/blob/6a4b46cd70d2672bc4be59dcb5b8dede22ed0cef/packages/react-refresh/src/ReactFreshRuntime.js#L427). this gives us access to react internals without needing to use react devtools.

[`react-scan`](https://github.com/aidenybai/react-scan) is a tool that highlights renders in your react app. under the hood, it uses bippy to detect rendered fibers.

fibers are how "work" is represented in react. each fiber either represents a composite (function/class component) or a host (dom element). [here is a live visualization](https://jser.pro/ddir/rie?reactVersion=18.3.1&snippetKey=hq8jm2ylzb9u8eh468) of what the fiber tree looks like, and here is a [deep dive article](https://jser.dev/2023-07-18-how-react-rerenders/).

a simplified version of a fiber looks roughly like this:

```typescript
interface Fiber {
  // component type (function/class)
  type: any;

  child: Fiber | null;
  sibling: Fiber | null;

  // parent fiber
  return: Fiber | null;

  // saved props input
  memoizedProps: any;

  // state (useState, useReducer, useSES, etc.)
  memoizedState: any;

  // contexts (useContext)
  dependencies: Dependencies | null;
}
```

however, fibers aren't directly accessible by the user. so, we have to hack our way around to accessing it.

luckily, react [reads from a property](https://github.com/facebook/react/blob/6a4b46cd70d2672bc4be59dcb5b8dede22ed0cef/packages/react-reconciler/src/ReactFiberDevToolsHook.js#L48) in the window object: `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` and runs handlers on it when certain events happen. this is intended for react devtools, but we can use it to our advantage.

here's what it roughly looks like:

```typescript
interface __REACT_DEVTOOLS_GLOBAL_HOOK__ {
  // list of renderers (react-dom, react-native, etc.)
  renderers: Map<RendererID, ReactRenderer>;

  // called when react has rendered everythign and ready to apply changes to the host tree (e.g. DOM mutations)
  onCommitFiberRoot: (
    rendererID: RendererID,
    fiber: Record<string, unknown>,
    commitPriority?: number,
    didError?: boolean
  ) => void;
}
```

we can use bippy's utils and the `onCommitFiberRoot` handler to detect renders!

## api reference

### instrument

installs the React DevTools global hook and allows you to set up custom handlers for React fiber events. This function must be called before React is imported.

```typescript
import { instrument } from 'bippy';

// Instrument the DevTools hook
instrument({
  onCommitFiberRoot(rendererID, root) {
    console.log('Fiber root committed:', root);
  },
  onCommitFiberUnmount(rendererID, fiber) {
    console.log('Fiber unmounted:', fiber);
  },
  onActive() {
    console.log('Instrumentation is active.');
  },
});
```

#### parameters

- `options: { onCommitFiberRoot?: Function; onCommitFiberUnmount?: Function; onPostCommitFiberRoot?: Function; onActive?: Function; name?: string; }`
  - `onCommitFiberRoot` - Called when React commits a fiber root.
  - `onCommitFiberUnmount` - Called when a fiber is unmounted.
  - `onPostCommitFiberRoot` - Called after React commits a fiber root.
  - `onActive` - Called when the instrumentation becomes active.
  - `name` - Optional name for the instrumentation source.

### createFiberVisitor

Creates a fiber visitor function that can be used to traverse fiber trees and handle render phases.

```typescript
import { createFiberVisitor } from 'bippy';

const visit = createFiberVisitor({
  onRender(fiber, phase) {
    console.log(`Fiber ${phase}:`, fiber);
  },
  onError(error) {
    console.error('Error during fiber traversal:', error);
  },
});

// Use the visitor in your instrumentation
instrument({
  onCommitFiberRoot(rendererID, root) {
    visit(rendererID, root);
  },
});
```

#### parameters

- `options: { onRender: Function; onError?: Function; }`
  - `onRender` - Called when a fiber is rendered, updated, or unmounted.
  - `onError` - Optional error handler.

### getRDTHook

Returns the current React DevTools global hook, installing it if necessary.

```typescript
import { getRDTHook } from 'bippy';

const devtoolsHook = getRDTHook(() => {
  console.log('React DevTools hook is active.');
});
```

#### parameters

- `onActive?: () => unknown` - Optional callback when the hook becomes active.

### installRDTHook

Installs the React DevTools global hook.

```typescript
import { installRDTHook } from 'bippy';

const devtoolsHook = installRDTHook(() => {
  console.log('React DevTools hook installed.');
});
```

#### parameters

- `onActive?: () => unknown` - Optional callback when the hook becomes active.

## fiber utilities

### isValidElement

Returns `true` if the object is a valid React element.

```typescript
import { isValidElement } from 'bippy';
import React from 'react';

const element = <div />;
console.log(isValidElement(element)); // true
```

#### parameters

- `element: unknown` - The object to check.

### isHostFiber

Checks if a fiber is a host fiber (e.g., DOM nodes in `react-dom`).

```typescript
import { isHostFiber } from 'bippy';

const result = isHostFiber(fiber);
console.log('Is host fiber:', result);
```

#### parameters

- `fiber: Fiber` - The fiber to check.

### isCompositeFiber

Determines if a fiber is a composite fiber (e.g., function or class components).

```typescript
import { isCompositeFiber } from 'bippy';

const result = isCompositeFiber(fiber);
console.log('Is composite fiber:', result);
```

#### parameters

- `fiber: Fiber` - The fiber to check.

### traverseFiber

Traverses up or down a fiber tree. Returns the first fiber for which the selector returns `true`.

```typescript
import { traverseFiber } from 'bippy';

const targetFiber = traverseFiber(fiber, (node) => {
  return node.type === MyComponent;
});
```

#### parameters

- `fiber: Fiber | null` - The starting fiber.
- `selector: (node: Fiber) => boolean` - The function to select the target fiber.
- `ascending?: boolean` - Whether to traverse up (true) or down (false). Defaults to false.

### getNearestHostFiber

Finds the nearest host fiber to a given fiber.

```typescript
import { getNearestHostFiber } from 'bippy';

const hostFiber = getNearestHostFiber(fiber);
```

#### parameters

- `fiber: Fiber` - The starting fiber.
- `ascending?: boolean` - Whether to search upwards. Defaults to false.

### getNearestHostFibers

Gets all host fibers associated with the given fiber.

```typescript
import { getNearestHostFibers } from 'bippy';

const hostFibers = getNearestHostFibers(fiber);
```

#### parameters

- `fiber: Fiber` - The starting fiber.

### getFiberStack

Retrieves the stack of fibers from the current fiber to the root.

```typescript
import { getFiberStack } from 'bippy';

const fiberStack = getFiberStack(fiber);
```

#### parameters

- `fiber: Fiber` - The starting fiber.

### traverseContexts

Traverses a fiber's contexts. Calls the selector with each context value.

```typescript
import { traverseContexts } from 'bippy';

traverseContexts(fiber, (nextValue, prevValue) => {
  console.log('Context changed from', prevValue, 'to', nextValue);
});
```

#### parameters

- `fiber: Fiber` - The starting fiber.
- `selector: (nextValue, prevValue) => boolean | void` - Called with context values. Return `true` to stop traversal.

### traverseState

Traverses a fiber's state updates. Calls the selector with each state value.

```typescript
import { traverseState } from 'bippy';

traverseState(fiber, (prevState, nextState) => {
  console.log('State changed from', prevState, 'to', nextState);
});
```

#### parameters

- `fiber: Fiber` - The starting fiber.
- `selector: (prevState, nextState) => boolean | void` - Called with state values. Return `true` to stop traversal.

### traverseProps

Traverses a fiber's props. Calls the selector with each prop value.

```typescript
import { traverseProps } from 'bippy';

traverseProps(fiber, (propName, nextValue, prevValue) => {
  console.log(`Prop "${propName}" changed from`, prevValue, 'to', nextValue);
});
```

#### parameters

- `fiber: Fiber` - The starting fiber.
- `selector: (propName, nextValue, prevValue) => boolean | void` - Called with prop values. Return `true` to stop traversal.

## render utilities

### didFiberRender

Returns `true` if the fiber has rendered.

```typescript
import { didFiberRender } from 'bippy';

const hasRendered = didFiberRender(fiber);
```

#### parameters

- `fiber: Fiber` - The fiber to check.

### didFiberCommit

Checks if the fiber has committed.

```typescript
import { didFiberCommit } from 'bippy';

const hasCommitted = didFiberCommit(fiber);
```

#### parameters

- `fiber: Fiber` - The fiber to check.

### getMutatedHostFibers

Retrieves all host fibers that have mutated.

```typescript
import { getMutatedHostFibers } from 'bippy';

const mutatedFibers = getMutatedHostFibers(fiber);
```

#### parameters

- `fiber: Fiber` - The starting fiber.

### getTimings

Gets the self and total render times for a fiber.

```typescript
import { getTimings } from 'bippy';

const { selfTime, totalTime } = getTimings(fiber);
console.log('Self time:', selfTime);
console.log('Total time:', totalTime);
```

#### parameters

- `fiber?: Fiber | null | undefined` - The fiber to get timings for.

## other utilities

### hasMemoCache

Checks if the fiber uses React Compiler's memo cache.

```typescript
import { hasMemoCache } from 'bippy';

const usesMemoCache = hasMemoCache(fiber);
```

#### parameters

- `fiber: Fiber` - The fiber to check.

### getType

Gets the component type of the fiber.

```typescript
import { getType } from 'bippy';

const type = getType(fiber.type);
if (type) {
  console.log('Fiber type:', type.name);
}
```

#### parameters

- `type: unknown` - The type to get.

### getDisplayName

Gets the display name of the fiber's component.

```typescript
import { getDisplayName } from 'bippy';

const displayName = getDisplayName(fiber.type);
console.log('Display name:', displayName);
```

#### parameters

- `type: unknown` - The type to get the display name for.

### isUsingRDT

Checks if the React DevTools backend is injected.

```typescript
import { isUsingRDT } from 'bippy';

const usingDevTools = isUsingRDT();
console.log('Is using React DevTools:', usingDevTools);
```

### detectReactBuildType

Detects the build type (development or production) of the React renderer.

```typescript
import { detectReactBuildType } from 'bippy';

const buildType = detectReactBuildType(renderer);
console.log('React build type:', buildType);
```

#### parameters

- `renderer: ReactRenderer` - The React renderer to check.

### isInstrumentationActive

Determines if bippy's instrumentation is active.

```typescript
import { isInstrumentationActive } from 'bippy';

const active = isInstrumentationActive();
console.log('Instrumentation active:', active);
```

You can learn more about bippy by [reading the source code](https://github.com/aidenybai/bippy/blob/main/src/index.ts).

Looking for a more robust tool? Try out [react-scan](https://github.com/aidenybai/react-scan).

## example: create a mini react-scan

[`react-scan`](https://github.com/aidenybai/react-scan) is a tool that highlights renders in your react app. under the hood, it uses bippy to detect rendered fibers.

fibers are how "work" is represented in react. each fiber either represents a composite (function/class component) or a host (dom element). [here is a live visualization](https://jser.pro/ddir/rie?reactVersion=18.3.1&snippetKey=hq8jm2ylzb9u8eh468) of what the fiber tree looks like, and here is a [deep dive article](https://jser.dev/2023-07-18-how-react-rerenders/).

a simplified version of a fiber looks roughly like this:

```typescript
interface Fiber {
  // component type (function/class)
  type: any;

  child: Fiber | null;
  sibling: Fiber | null;

  // parent fiber
  return: Fiber | null;

  // saved props input
  memoizedProps: any;

  // state (useState, useReducer, useSES, etc.)
  memoizedState: any;

  // contexts (useContext)
  dependencies: Dependencies | null;
}
```

however, fibers aren't directly accessible by the user. so, we have to hack our way around to accessing it.

luckily, react [reads from a property](https://github.com/facebook/react/blob/6a4b46cd70d2672bc4be59dcb5b8dede22ed0cef/packages/react-reconciler/src/ReactFiberDevToolsHook.js#L48) in the window object: `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` and runs handlers on it when certain events happen. this is intended for react devtools, but we can use it to our advantage.

here's what it roughly looks like:

```typescript
interface __REACT_DEVTOOLS_GLOBAL_HOOK__ {
  // list of renderers (react-dom, react-native, etc.)
  renderers: Map<RendererID, ReactRenderer>;

  // called when react has rendered everythign and ready to apply changes to the host tree (e.g. DOM mutations)
  onCommitFiberRoot: (
    rendererID: RendererID,
    fiber: Record<string, unknown>,
    commitPriority?: number,
    didError?: boolean
  ) => void;
}
```

we can use bippy's utils and the `onCommitFiberRoot` handler to detect renders!

### 0. setup

first, [create a new react project via stackblitz](https://stackblitz.com/fork/github/vitejs/vite/tree/main/packages/create-vite/template-react?file=src/App.jsx&terminal=dev)

then, install bippy:

```bash
npm install bippy
```

finally, re-run the dev server:

```bash
npm run dev
```

### 1. use `onCommitFiberRoot` to get fibers

let's use `instrument` to stub the `__REACT_DEVTOOLS_GLOBAL_HOOK__` object, and setup a custom handler for `onCommitFiberRoot`.

```jsx
import { instrument } from 'bippy'; // must be imported BEFORE react

// rest of your code ...

instrument({
  onCommitFiberRoot(rendererID, root) {
    const fiberRoot = root.current;
    console.log('fiberRoot', fiberRoot);
  },
});
```

running this should log `fiberRoot` to the console. i recommend you playing with this code to get a feel for how fibers work.

### 2. create a fiber visitor

now, let's create a fiber visitor with `createFiberVisitor` to "visit" fibers that render. not every fiber actually renders, so we need to filter for the ones that do.

```jsx
import { instrument, createFiberVisitor } from 'bippy'; // must be imported BEFORE react

// rest of your code ...

const visit = createFiberVisitor({
  onRender(fiber) {
    console.log('fiber render', fiber);
  },
});

instrument({
  onCommitFiberRoot(rendererID, root) {
    visit(rendererID, root);
  },
});
```

### 3. determine DOM nodes to highlight

next, we need to identify which DOM nodes we are going to highlight. we can do this by checking if the fiber is a host fiber, or if it's not, find the nearest host fiber.

```jsx
import {
  instrument,
  isHostFiber,
  getNearestHostFiber,
  createFiberVisitor,
} from 'bippy'; // must be imported BEFORE react

// rest of your code ...

const highlightFiber = (fiber) => {
  if (!(fiber instanceof HTMLElement)) return;

  console.log('highlight dom node', fiber.stateNode);
};

const visit = createFiberVisitor({
  onRender(fiber) {
    if (isHostFiber(fiber)) {
      highlightFiber(fiber);
    } else {
      // can be a component
      const hostFiber = getNearestHostFiber(fiber);
      highlightFiber(hostFiber);
    }
  },
});

instrument({
  onCommitFiberRoot(rendererID, root) {
    visit(rendererID, root);
  },
});
```

### 4. highlight DOM nodes

now, let's implement the `highlightFiber` function to highlight the DOM node. the simplest way is to just overlay a div (with a red border) on top of the DOM node.

```jsx
import {
  instrument,
  isHostFiber,
  getNearestHostFiber,
  createFiberVisitor,
} from 'bippy'; // must be imported BEFORE react

// rest of your code ...

const highlightFiber = (fiber) => {
  if (!(fiber.stateNode instanceof HTMLElement)) return;

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

const visit = createFiberVisitor({
  onRender(fiber) {
    if (isHostFiber(fiber)) {
      highlightFiber(fiber);
    } else {
      // can be a component
      const hostFiber = getNearestHostFiber(fiber);
      highlightFiber(hostFiber);
    }
  },
});

instrument({
  onCommitFiberRoot(rendererID, root) {
    visit(rendererID, root);
  },
});
```

## misc

the original bippy character is owned and created by [@dairyfreerice](https://www.instagram.com/dairyfreerice). this project is not related to the bippy brand, i just think the character is c
