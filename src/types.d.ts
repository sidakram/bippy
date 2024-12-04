interface ReactDevToolsGlobalHook {
  checkDCE: () => void;
  supportsFiber: boolean;
  supportsFlight: boolean;
  renderers: Map<number, unknown>;
  onCommitFiberRoot: (rendererID: number, root: unknown) => void;
  onCommitFiberUnmount: (rendererID: number, root: unknown) => void;
  onPostCommitFiberRoot: (rendererID: number, root: unknown) => void;
  inject: (renderer: unknown) => number;
}

declare global {
  // eslint-disable-next-line no-var
  var __REACT_DEVTOOLS_GLOBAL_HOOK__: ReactDevToolsGlobalHook;
}

export {};
