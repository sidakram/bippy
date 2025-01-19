// import bippy, then react
process.env.NODE_ENV = 'production';
import { expect, it, vi } from 'vitest';
const { instrument, secure } = await import('../../index.js');
// biome-ignore lint/correctness/noUnusedVariables: needed for JSX
const React = require('react');
import { render } from '@testing-library/react';

it('should not be active', () => {
  const onActive = vi.fn();
  render(<div>Hello</div>);
  instrument(
    secure({
      onActive,
    }),
  );
  expect(onActive).not.toHaveBeenCalled();
});
