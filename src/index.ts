import { installRDTHook } from "./core.js";

// __REACT_DEVTOOLS_GLOBAL_HOOK__ must exist before React is ever executed
if (
	typeof window !== "undefined" &&
	// @ts-expect-error `document` may not be defined in some enviroments
	(window.document?.createElement ||
		window.navigator?.product === "ReactNative") &&
	typeof process !== "undefined" &&
	process.versions != null &&
	process.versions.node != null
) {
	installRDTHook();
}

export * from "./core.js";
