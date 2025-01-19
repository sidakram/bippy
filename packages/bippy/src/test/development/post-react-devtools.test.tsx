// import bippy, then react devtools

import { expect, vi, it } from 'vitest';
const { instrument } = await import('../../index.js');

// @ts-ignore
import { activate, initialize } from 'react-devtools-inline/backend';
// @ts-ignore
import { initialize as initializeFrontend } from 'react-devtools-inline/frontend';

initialize(window);

const DevTools = initializeFrontend(window);

activate(window);
// biome-ignore lint/correctness/noUnusedVariables: needed for JSX
const React = await import('react');
const { render } = await import('@testing-library/react');

it('should be active', () => {
  render(<div>Hello</div>);
  render(<DevTools />);

  const onActive = vi.fn();
  instrument({
    onActive,
  });
  expect(onActive).toHaveBeenCalled();
});
