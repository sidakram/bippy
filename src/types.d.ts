import type { ReactDevToolsGlobalHook } from './index.js';

declare global {
  // eslint-disable-next-line no-var
  var __REACT_DEVTOOLS_GLOBAL_HOOK__: ReactDevToolsGlobalHook;
}

export {};
