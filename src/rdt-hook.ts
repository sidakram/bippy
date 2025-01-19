import type { ReactDevToolsGlobalHook, ReactRenderer } from './types.js';

export const version = process.env.VERSION;
export const BIPPY_INSTRUMENTATION_STRING = `bippy-${version}`;

const objectDefineProperty = Object.defineProperty;
const objectHasOwnProperty = Object.prototype.hasOwnProperty;

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
let injectFnStr: string | undefined = undefined;

export const isReactRefresh = (rdtHook = getRDTHook()): boolean => {
  if (isReactRefreshOverride) return true;
  if (typeof rdtHook.inject === 'function') {
    injectFnStr = rdtHook.inject.toString();
  }
  return Boolean(injectFnStr?.includes('function(injected)'));
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
    objectDefineProperty(globalThis, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
      value: rdtHook,
      configurable: true,
      writable: true,
    });
  } catch {
    patchRDTHook(onActive);
  }
  return rdtHook;
};

export const patchRDTHook = (onActive?: () => unknown): void => {
  try {
    const rdtHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (rdtHook) {
      if (!rdtHook._instrumentationSource) {
        isReactRefreshOverride = isReactRefresh(rdtHook);
        rdtHook.checkDCE = checkDCE;
        rdtHook.supportsFiber = true;
        rdtHook.supportsFlight = true;
        rdtHook.hasUnsupportedRendererAttached = false;
        rdtHook._instrumentationSource = BIPPY_INSTRUMENTATION_STRING;
        if (rdtHook.renderers.size) {
          rdtHook._instrumentationIsActive = true;
          onActive?.();
          return;
        }
        const prevInject = rdtHook.inject;
        rdtHook.inject = (renderer) => {
          const id = prevInject(renderer);
          rdtHook._instrumentationIsActive = true;
          onActive?.();
          return id;
        };
      } else if (rdtHook.renderers.size || rdtHook._instrumentationIsActive) {
        onActive?.();
        return;
      }
    }
  } catch {}
};

export const hasRDTHook = (): boolean => {
  return objectHasOwnProperty.call(
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
  // must exist at this point
  return globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ as ReactDevToolsGlobalHook;
};

export const isClientEnvironment = (): boolean => {
  return Boolean(
    typeof window !== 'undefined' &&
      (window.document?.createElement ||
        window.navigator?.product === 'ReactNative'),
  );
};

/**
 * If bippy runs in a Chrome Extension (or somehow runs before React Devtools is loaded),.
 * it will cause React Devtools to crash. This hack is a workaround to prevent this.
 *
 * @see https://github.com/facebook/react/blob/18eaf51bd51fed8dfed661d64c306759101d0bfd/packages/react-devtools-extensions/src/contentScripts/backendManager.js#L206C13-L206C56
 */
export const deleteRDTIfBackendManagerInjected = (): void => {
  if (
    objectHasOwnProperty.call(
      globalThis,
      '__REACT_DEVTOOLS_BACKEND_MANAGER_INJECTED__',
    )
  ) {
    return;
  }

  objectDefineProperty(
    globalThis,
    '__REACT_DEVTOOLS_BACKEND_MANAGER_INJECTED__',
    {
      configurable: true,
      writable: true,
      get() {
        try {
          globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
        } catch {}
        return undefined;
      },
    },
  );
};

try {
  // __REACT_DEVTOOLS_GLOBAL_HOOK__ must exist before React is ever executed
  if (isClientEnvironment()) {
    getRDTHook();
    deleteRDTIfBackendManagerInjected();
  }
} catch {}
