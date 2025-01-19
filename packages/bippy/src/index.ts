import { getRDTHook, isClientEnvironment } from './rdt-hook.js';

export * from './core.js';

try {
  // __REACT_DEVTOOLS_GLOBAL_HOOK__ must exist before React is ever executed
  if (isClientEnvironment()) {
    getRDTHook();
  }
} catch {}
