// import react, then bippy
process.env.NODE_ENV = 'production';

import { expect, it, vi } from 'vitest';
// biome-ignore lint/correctness/noUnusedVariables: needed for JSX
const React = await import('react');
const { instrument, secure } = await import('../../index.js'); // delay it
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
