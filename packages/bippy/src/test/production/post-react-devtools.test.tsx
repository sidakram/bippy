// import bippy, then react devtools
process.env.NODE_ENV = 'production';

import { expect, vi, it } from 'vitest';
const { instrument, secure } = await import('../../index.js');

// @ts-ignore
import { activate, initialize } from 'react-devtools-inline/backend';
// @ts-ignore
import { initialize as initializeFrontend } from 'react-devtools-inline/frontend';
import { render } from '@testing-library/react';

initialize(window);

// biome-ignore lint/correctness/noUnusedVariables: needed for JSX
const React = await import('react');

const DevTools = initializeFrontend(window);

activate(window);

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
