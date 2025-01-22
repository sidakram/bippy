import { it, vi, expect } from 'vitest';
import { instrument, secure } from '../../index.js';
import React from 'react';
import { render } from '@testing-library/react';
import { BasicComponent } from '../components.js';

it('handle multiple onActive calls', () => {
  const onActive = vi.fn();
  const onActive2 = vi.fn();
  const onActive3 = vi.fn();
  const noOnActive = vi.fn();
  instrument({ onActive });
  instrument({ onActive: onActive2 });
  render(<BasicComponent />);
  instrument({ onActive: onActive3 });
  instrument(
    secure({
      onActive: noOnActive,
    }),
  );
  expect(onActive).toHaveBeenCalledOnce();
  expect(onActive2).toHaveBeenCalledOnce();
  expect(onActive3).toHaveBeenCalledOnce();
  expect(noOnActive).not.toHaveBeenCalled();
});
