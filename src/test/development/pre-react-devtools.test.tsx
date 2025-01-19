// import react devtools, then bippy

import { expect, vi, it } from 'vitest';

// @ts-ignore
import { activate, initialize } from 'react-devtools-inline/backend';
// @ts-ignore
import { initialize as initializeFrontend } from 'react-devtools-inline/frontend';

initialize(window);

// biome-ignore lint/correctness/noUnusedVariables: needed for JSX
const React = await import('react');

const DevTools = initializeFrontend(window);

activate(window);

const { render } = await import('@testing-library/react');
const { instrument } = await import('../../index.js');

it('should be active', () => {
  render(<div>Hello</div>);
  render(<DevTools />);
  const onActive = vi.fn();
  instrument({
    onActive,
  });
  expect(onActive).toHaveBeenCalled();
});
