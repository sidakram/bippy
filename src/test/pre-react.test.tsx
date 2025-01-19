// import react, then bippy

import { expect, it, vi } from 'vitest';
import React from 'react';
const { instrument } = await import('../index.js'); // delay it
import { render } from '@testing-library/react';

it('should be active', () => {
  const onActive = vi.fn();
  render(<div>Hello</div>);
  instrument({
    onActive,
  });
  expect(onActive).not.toHaveBeenCalled();
});
