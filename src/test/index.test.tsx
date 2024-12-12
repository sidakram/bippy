import { expect, test } from 'vitest';
import {
  getDisplayName,
  getRDTHook,
  getType,
  instrument,
  isValidElement,
} from '../index.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './complicated-react-app.js';
import { Fiber, FiberRoot } from 'react-reconciler';

const root = ReactDOM.createRoot(document.createElement('div'));

root.render(<App />);

const fiberRoots = new Set<FiberRoot>();
instrument({
  onCommitFiberRoot: (_rendererID, root) => {
    fiberRoots.add(root);
  },
});

test('isValidElement', () => {
  expect(isValidElement(React.createElement('div'))).toBe(true);
  expect(isValidElement({})).toBe(false);
});

test('getType', () => {
  const Component = () => <div>Hello</div>;
  const ForwardedComponent = React.forwardRef(Component);
  const MemoComponent = React.memo(Component);
  const MemoForwardedComponent = React.memo(ForwardedComponent);
  expect(getType(Component)).toBe(Component);
  expect(getType(ForwardedComponent)).toBe(Component);
  expect(getType(MemoComponent)).toBe(Component);
  expect(getType(MemoForwardedComponent)).toBe(Component);
});

test('getDisplayName', () => {
  const ArrowFnComponent = () => null;
  ArrowFnComponent.displayName = 'ArrowFnComponent';
  function FnComponent() {
    return null;
  }
  const MemoComponent = React.memo(FnComponent);
  MemoComponent.displayName = 'MemoComponent';
  expect(getDisplayName(ArrowFnComponent)).toBe('ArrowFnComponent');
  expect(getDisplayName(FnComponent)).toBe('FnComponent');
  expect(getDisplayName(MemoComponent)).toBe('MemoComponent');
});

test('getRDTHook', () => {
  const hook = getRDTHook();
  expect(hook).toEqual(window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
});

test('instrument', () => {
  expect(fiberRoots.size).toBeGreaterThan(0);
  for (const fiberRoot of fiberRoots) {
    expect(fiberRoot.current.child.elementType).toEqual(App);
  }
});
