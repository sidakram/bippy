import type { ReactDevToolsGlobalHook } from "./core.ts";

declare global {
	var __REACT_DEVTOOLS_GLOBAL_HOOK__: ReactDevToolsGlobalHook;
}
