import type { ReactDevToolsGlobalHook, ReactRenderer } from './types.js';

export const version = process.env.VERSION;
export const BIPPY_INSTRUMENTATION_STRING = `bippy-${version}`;

const NO_OP = () => {
  /**/
};

const checkDCE = (fn: unknown): void => {
  try {
    const code = Function.prototype.toString.call(fn);
    if (code.indexOf('^_^') > -1) {
      setTimeout(() => {
        throw new Error(
          'React is running in production mode, but dead code ' +
            'elimination has not been applied. Read how to correctly ' +
            'configure React for production: ' +
            'https://reactjs.org/link/perf-use-production-build',
        );
      });
    }
  } catch {}
};

export const isRealReactDevtools = (rdtHook = getRDTHook()): boolean => {
  return 'getFiberRoots' in rdtHook;
};

let isReactRefreshOverride = false;

export const isReactRefresh = (rdtHook = getRDTHook()): boolean => {
  if (isReactRefreshOverride) return true;
  return !('checkDCE' in rdtHook);
};

export const installRDTHook = (
  onActive?: () => unknown,
): ReactDevToolsGlobalHook => {
  const renderers = new Map<number, ReactRenderer>();
  let i = 0;
  const rdtHook: ReactDevToolsGlobalHook = {
    checkDCE,
    supportsFiber: true,
    supportsFlight: true,
    hasUnsupportedRendererAttached: false,
    renderers,
    onCommitFiberRoot: NO_OP,
    onCommitFiberUnmount: NO_OP,
    onPostCommitFiberRoot: NO_OP,
    inject(renderer) {
      const nextID = ++i;
      renderers.set(nextID, renderer);
      if (!rdtHook._instrumentationIsActive) {
        rdtHook._instrumentationIsActive = true;
        onActive?.();
      }
      return nextID;
    },
    _instrumentationSource: BIPPY_INSTRUMENTATION_STRING,
    _instrumentationIsActive: false,
  };
  try {
    Object.defineProperty(globalThis, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
      value: rdtHook,
    });
  } catch {
    patchRDTHook(onActive);
  }
  return rdtHook;
};

export const patchRDTHook = (onActive?: () => unknown): void => {
  try {
    const rdtHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!rdtHook._instrumentationSource) {
      isReactRefreshOverride = isReactRefresh(rdtHook);
      rdtHook.checkDCE = checkDCE;
      rdtHook.supportsFiber = true;
      rdtHook.supportsFlight = true;
      rdtHook.hasUnsupportedRendererAttached = false;
      rdtHook._instrumentationSource = BIPPY_INSTRUMENTATION_STRING;
      rdtHook._instrumentationIsActive = true;
    }
  } catch {}
  onActive?.();
};

export const hasRDTHook = (): boolean => {
  return Object.prototype.hasOwnProperty.call(
    globalThis,
    '__REACT_DEVTOOLS_GLOBAL_HOOK__',
  );
};

/**
 * Returns the current React DevTools global hook.
 */
export const getRDTHook = (
  onActive?: () => unknown,
): ReactDevToolsGlobalHook => {
  if (!hasRDTHook()) {
    return installRDTHook(onActive);
  }
  patchRDTHook(onActive);
  return globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
};

export const registerServiceWorker = async (): Promise<void> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  console.log('import.meta.url', import.meta.url);

  let path = './sw.js';

  if (import.meta.url.includes('.vite/deps')) {
    path = '../../node_modules/bippy/dist/sw.js';
  }

  try {
    const res = await fetch(path, { method: 'HEAD' });
    if (res.ok) {
      await navigator.serviceWorker.register(path, {
        // scope: '/',
      });
    }
  } catch {}
};

try {
  // __REACT_DEVTOOLS_GLOBAL_HOOK__ must exist before React is ever executed
  if (
    typeof window !== 'undefined' &&
    // @ts-expect-error `document` may not be defined in some enviroments
    (window.document?.createElement ||
      window.navigator?.product === 'ReactNative')
  ) {
    installRDTHook();
  }
} catch {}

export const INSTALL_HOOK_SCRIPT_STRING =
  '(()=>{try{var t=()=>{};const n=new Map;let o=0;globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__={checkDCE:t,supportsFiber:!0,supportsFlight:!0,hasUnsupportedRendererAttached:!1,renderers:n,onCommitFiberRoot:t,onCommitFiberUnmount:t,onPostCommitFiberRoot:t,inject(t){var e=++o;return n.set(e,t),globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__._instrumentationIsActive=!0,e},_instrumentationIsActive:!1}}catch{}})()';
