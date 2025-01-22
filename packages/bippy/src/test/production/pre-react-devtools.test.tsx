// import react devtools, then bippy

import { expect, vi, it } from 'vitest';

// @ts-ignore
const { activate, initialize } = await import('react-devtools-inline/backend');
const { initialize: initializeFrontend } = await import(
  // @ts-ignore
  'react-devtools-inline/frontend'
);

initialize(window);

// biome-ignore lint/correctness/noUnusedVariables: needed for JSX
const React = await import('react');
const { render } = await import('@testing-library/react');

const DevTools = initializeFrontend(window);

activate(window);

const { instrument, secure } = await import('../../index.js');

it('should not be active', () => {
  render(<div>Hello</div>);
  render(<DevTools />);
  const onActive = vi.fn();
  instrument(
    secure({
      onActive,
    }),
  );
  expect(onActive).not.toHaveBeenCalled();
});
