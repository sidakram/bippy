import { expect, vi, it } from 'vitest';

// @ts-ignore
import { activate, initialize } from 'react-devtools-inline/backend';
// @ts-ignore
import { initialize as initializeFrontend } from 'react-devtools-inline/frontend';
import { render } from '@testing-library/react';

initialize(window);

const React = await import('react');

const DevTools = initializeFrontend(window);

activate(window);

const { instrument } = await import('../index.js');

it('should be active', () => {
  render(<DevTools />);
  const onActive = vi.fn();
  instrument({
    onActive,
  });
  expect(onActive).toHaveBeenCalled();
});
