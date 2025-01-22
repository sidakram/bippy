// import bippy, then react
import { expect, it, vi } from 'vitest';
const { instrument, secure } = await import('../../index.js');
// biome-ignore lint/correctness/noUnusedVariables: needed for JSX
const React = require('react');
const { render } = await import('@testing-library/react');

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
