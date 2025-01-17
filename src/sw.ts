/// <reference lib="webworker" />.

import './types.js';

(() => {
  try {
    const NO_OP = () => {};
    const renderers = new Map();
    let id = 0;
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      checkDCE: NO_OP,
      supportsFiber: true,
      supportsFlight: true,
      hasUnsupportedRendererAttached: false,
      renderers,
      onCommitFiberRoot: NO_OP,
      onCommitFiberUnmount: NO_OP,
      onPostCommitFiberRoot: NO_OP,
      inject(renderer) {
        const nextID = ++id;
        renderers.set(nextID, renderer);
        globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__._instrumentationIsActive = true;
        return nextID;
      },
      _instrumentationIsActive: false,
    };
  } catch {}
})();
