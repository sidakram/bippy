import { expect, it } from 'vitest';
import { instrument, parseReactHooks, traverseFiber } from '../../index.js';
import { BasicComponentWithMutation } from '../components.js';
import { render } from '@testing-library/react';
import React from 'react';

it('should parse hooks', () => {
  instrument({
    onCommitFiberRoot(_, fiberRoot) {
      traverseFiber(fiberRoot.current, (fiber) => {
        const hooks = parseReactHooks(fiber);
        console.log(hooks);
      });
    },
  });
  render(<BasicComponentWithMutation />);
});
