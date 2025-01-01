import { useEffect, useState } from "react";
import { getRDTHook, getDisplayName, traverseFiber } from "bippy";
import { Inspector } from "react-inspector";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import {
	SandpackProvider,
	SandpackLayout,
	SandpackCodeEditor,
	SandpackPreview,
} from "@codesandbox/sandpack-react";

const getFiberFromElement = (element) => {
	const { renderers } = getRDTHook();
	for (const [_, renderer] of Array.from(renderers || [])) {
		try {
			const fiber = renderer.findFiberByHostInstance(element);
			if (fiber) return fiber;
		} catch {}
	}

	if ("_reactRootContainer" in element) {
		return element._reactRootContainer?._internalRoot?.current?.child;
	}

	for (const key in element) {
		if (
			key.startsWith("__reactInternalInstance$") ||
			key.startsWith("__reactFiber")
		) {
			return element[key];
		}
	}
	return null;
};

const throttle = (fn, wait) => {
	let timeout;
	return (...args) => {
		if (!timeout) {
			timeout = setTimeout(() => {
				fn(...args);
				timeout = null;
			}, wait);
		}
	};
};

export const HoverOverlay = ({ isInspectorEnabled = true }) => {
	const [fiber, setFiber] = useState(null);
	const [rect, setRect] = useState(null);
	useEffect(() => {
		const handleMouseMove = throttle((event) => {
			if (window.innerWidth < 800 || !isInspectorEnabled) {
				setFiber(null);
				setRect(null);
				return;
			}
			const element = document.elementFromPoint(event.clientX, event.clientY);
			const fiber = getFiberFromElement(element);
			let foundInspect = false;
			traverseFiber(
				fiber,
				(innerFiber) => {
					if (innerFiber.type === Inspector) {
						foundInspect = true;
						return true;
					}
				},
				true,
			);
			traverseFiber(fiber, (innerFiber) => {
				if (innerFiber.type === Inspector) {
					foundInspect = true;
					return true;
				}
			});
			if (foundInspect) return;
			setFiber(fiber?.return || fiber);
			setRect(element.getBoundingClientRect());
		}, 16);
		document.addEventListener("mousemove", handleMouseMove);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
		};
	}, [isInspectorEnabled]);

	if (window.innerWidth < 800 || !fiber || !rect) return null;

	return (
		<>
			<div
				className="border border-black fixed bg-white z-50 p-[1ch] max-w-[50ch] transition-all duration-150 overflow-auto max-h-[40ch] shadow"
				style={{
					top: rect?.top,
					left: rect?.left + rect?.width,
					opacity: rect ? 1 : 0,
					transform: rect ? "translateY(0)" : "translateY(10px)",
					pointerEvents: rect ? "auto" : "none",
				}}
			>
				<Text
					as="h3"
					className="text-sm mb-[1ch] bg-neutral-100 px-[0.5ch] rounded-sm w-fit"
				>
					{`<${typeof fiber?.type === "string" ? fiber?.type : getDisplayName(fiber) || "unknown"}>`}
				</Text>
				<Inspector data={fiber} expandLevel={1} />
			</div>
			<div
				style={{
					left: rect?.left,
					top: rect?.top,
					width: rect?.width,
					height: rect?.height,
					opacity: rect ? 1 : 0,
				}}
				className="border border-neutral-400 border-dashed fixed z-40 pointer-events-none transition-all duration-150"
			/>
		</>
	);
};

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

function SideLayout({ children }) {
	return (
		<div className="relative leading-normal pl-[2ch] pt-[1lh] pr-[2ch] sm:pt-[2lh] sm:pl-[7ch] min-h-[100dvh] pb-[1lh] sm:max-w-[90ch]">
			{children}
		</div>
	);
}

function Text({ as = "p", children, className, ...props }) {
	const As = as;
	return (
		<As className={cn("text-lg", className)} {...props}>
			{children}
		</As>
	);
}

function Link({ children, className, href, ...props }) {
	return (
		<a
			href={href}
			className={cn("underline hover:bg-black hover:text-white", className)}
			{...props}
		>
			{children}
		</a>
	);
}

function List({ children, className }) {
	return (
		<ul
			className={cn(
				"pl-[2ch] list-disc marker:content-['→'] marker:text-neutral-400 marker:pr-[1ch] space-y-[1ch]",
				className,
			)}
		>
			{children}
		</ul>
	);
}

function ListItem({ children }) {
	return <li className="pl-[1ch]">{children}</li>;
}

export default function Main({ logs = [] }) {
	const [imgSize, setImgSize] = useState(50);
	const [isSpinning, setIsSpinning] = useState(false);
	const [isInspectorEnabled, setIsInspectorEnabled] = useState(false);

	return (
		<>
			<HoverOverlay isInspectorEnabled={isInspectorEnabled} />
			<SideLayout>
				<div className="flex items-center gap-[1ch]">
					<div className="flex items-center gap-[0.5ch]">
						<img
							src="/bippy.png"
							alt="bippy logo"
							className={cn("select-none", isSpinning && "animate-spin")}
							width={imgSize}
							height={imgSize}
							onClick={() => setImgSize(imgSize + 10)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									setImgSize(imgSize + 10);
								}
							}}
							onMouseEnter={() => setIsSpinning(true)}
							onMouseLeave={() => setIsSpinning(false)}
						/>
						<Text className="font-bold text-2xl" as="h1">
							bippy
						</Text>
					</div>
					<Link
						href="https://github.com/aidenybai/bippy"
						className="hidden sm:flex"
					>
						<Text as="span">{__VERSION__}</Text>
					</Link>
					<div className="ml-auto flex gap-[1ch] my-[1ch]">
						<span className="hidden sm:flex gap-[1ch]">
							<Text
								className={cn(
									"text-muted-foreground opacity-50",
									isInspectorEnabled && "opacity-100",
								)}
							>
								<Link
									onClick={() => setIsInspectorEnabled(!isInspectorEnabled)}
								>
									👁️ x-ray mode ({isInspectorEnabled ? "on" : "off"})
								</Link>
							</Text>{" "}
							&middot;
						</span>
						<Text className="text-muted-foreground">
							<Link href="https://github.com/aidenybai/bippy">/github</Link>
						</Text>
					</div>
				</div>

				<hr className="my-[1ch] border-neutral-200" />

				<div className="flex flex-col gap-[1ch] my-[2ch]">
					<Text className="text-muted-foreground">
						bippy is a toolkit to{" "}
						<Text as="span" className="font-bold">
							hack into react internals
						</Text>
					</Text>
				</div>

				<div className="flex flex-col gap-[1ch] my-[2ch]">
					<Text className="text-muted-foreground">
						by default, there is no official way to use react internals outside
						of react components. bippy bypasses this by "pretending" to be react
						devtools, giving you access to the fiber tree and other internals.
					</Text>
				</div>

				<List className="my-[2ch]">
					<ListItem>
						<Text className="text-muted-foreground">
							works outside of react – no react code modification needed
						</Text>
					</ListItem>
					<ListItem>
						<Text className="text-muted-foreground">
							utility functions that work across modern react (v17-19)
						</Text>
					</ListItem>
					<ListItem>
						<Text className="text-muted-foreground">
							no prior react source code knowledge required
						</Text>
					</ListItem>
				</List>

				<div className="hidden sm:block">
					<div className="flex flex-col gap-[1ch] my-[1ch]">
						<Text className="text-muted-foreground">
							here's an example <i>(open devtools console for output)</i>:
						</Text>
					</div>
					<SandpackProvider
						template="react"
						customSetup={{
							dependencies: {
								"react-inspector": "latest",
							},
						}}
						files={{
							"/node_modules/bippy/package.json": {
								hidden: true,
								code: JSON.stringify({
									name: "bippy",
									main: "./index.js",
								}),
							},
							"/node_modules/bippy/index.js": {
								hidden: true,
								code: BIPPY_SOURCE,
							},
							"/App.js": {
								active: true,
								code: `import { instrument, traverseFiber } from 'bippy';
import React, { useState, useEffect } from 'react';

instrument({
  onCommitFiberRoot(_, root) {
    traverseFiber(root.current, (fiber) => {
      // prints every fiber in app
      console.log('fiber:', fiber);
    });
  },
});

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button
        onClick={() =>
          setCount(count + 1)
        }
        style={{
          fontSize: "100px",
          marginBottom: "10px",
        }}
      >
        {count}
      </button>
      <div>Open devtools console to see output</div>
    </>
  );
}`,
							},
						}}
					>
						<SandpackLayout>
							<SandpackCodeEditor />
							<SandpackLayout>
								<SandpackPreview showOpenInCodeSandbox={false} />
							</SandpackLayout>
						</SandpackLayout>
					</SandpackProvider>
				</div>

				<div className="flex my-[2ch]">
					<a href="https://github.com/aidenybai/bippy">
						<button
							type="button"
							className="bg-black text-white px-[1ch] py-[0.5ch] rounded-sm hover:bg-neutral-800 transition-all duration-150 font-bold text-lg"
						>
							try bippy →
						</button>
					</a>
				</div>

				<div className="bg-[#eda33b]/25 text-black p-[1ch] my-[2ch] font-sans">
					<div>
						<Text className="text-xs">
							<Text as="span" className="text-xs font-bold">
								⚠️ warning:{" "}
							</Text>
							<Text as="span" className="text-xs">
								this project may break production apps and cause unexpected
								behavior
							</Text>
						</Text>
					</div>
					<div className="mt-[1ch]">
						<Text className="text-xs">
							this project uses react internals, which can change at any time.
							it is not recommended to depend on internals unless you really,{" "}
							<Text as="span" className="text-xs italic">
								really have to.
							</Text>{" "}
							by proceeding, you acknowledge the risk of breaking your own code
							or apps that use your code.
						</Text>
					</div>
				</div>
			</SideLayout>
		</>
	);
}

export const BIPPY_SOURCE = `/**
 * @license bippy
 *
 * Copyright (c) Aiden Bai, Million Software, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// src/rdt-hook.ts
var version = "0.1.0";
var BIPPY_INSTRUMENTATION_STRING = \`bippy-$\{version}\`;
var NO_OP = () => {
};
var checkDCE = (fn) => {
  try {
    const code = Function.prototype.toString.call(fn);
    if (code.indexOf("^_^") > -1) {
      setTimeout(() => {
        throw new Error(
          "React is running in production mode, but dead code elimination has not been applied. Read how to correctly configure React for production: https://reactjs.org/link/perf-use-production-build"
        );
      });
    }
  } catch {
  }
};
var installRDTHook = (onActive) => {
  const renderers = /* @__PURE__ */ new Map();
  let i = 0;
  const rdtHook = {
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
    _instrumentationIsActive: false
  };
  try {
    Object.defineProperty(globalThis, "__REACT_DEVTOOLS_GLOBAL_HOOK__", {
      value: rdtHook
    });
  } catch {
  }
  return rdtHook;
};
var hasRDTHook = () => {
  return Object.prototype.hasOwnProperty.call(
    globalThis,
    "__REACT_DEVTOOLS_GLOBAL_HOOK__"
  );
};
var getRDTHook = (onActive) => {
  let rdtHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (rdtHook) onActive?.();
  if (!hasRDTHook()) {
    rdtHook = installRDTHook(onActive);
  }
  return rdtHook;
};
try {
  if (typeof window !== "undefined" && // @ts-expect-error \`document\` may not be defined in some enviroments
  (window.document?.createElement || window.navigator?.product === "ReactNative") && typeof process !== "undefined" && process.versions != null && process.versions.node != null) {
    installRDTHook();
  }
} catch {
}

// src/core.ts
var ClassComponentTag = 1;
var FunctionComponentTag = 0;
var ContextConsumerTag = 9;
var SuspenseComponentTag = 13;
var OffscreenComponentTag = 22;
var ForwardRefTag = 11;
var MemoComponentTag = 14;
var SimpleMemoComponentTag = 15;
var HostComponentTag = 5;
var HostHoistableTag = 26;
var HostSingletonTag = 27;
var DehydratedSuspenseComponent = 18;
var HostText = 6;
var Fragment = 7;
var LegacyHiddenComponent = 23;
var OffscreenComponent = 22;
var HostRoot = 3;
var CONCURRENT_MODE_NUMBER = 60111;
var ELEMENT_TYPE_SYMBOL_STRING = "Symbol(react.element)";
var TRANSITIONAL_ELEMENT_TYPE_SYMBOL_STRING = "Symbol(react.transitional.element)";
var CONCURRENT_MODE_SYMBOL_STRING = "Symbol(react.concurrent_mode)";
var DEPRECATED_ASYNC_MODE_SYMBOL_STRING = "Symbol(react.async_mode)";
var PerformedWork = 1;
var Placement = 2;
var Hydrating = 4096;
var Update = 4;
var Cloned = 8;
var ChildDeletion = 16;
var ContentReset = 32;
var Snapshot = 1024;
var Visibility = 8192;
var MutationMask = Placement | Update | ChildDeletion | ContentReset | Hydrating | Visibility | Snapshot;
var isValidElement = (element) => typeof element === "object" && element != null && "$$typeof" in element && // react 18 uses Symbol.for('react.element'), react 19 uses Symbol.for('react.transitional.element')
[
  ELEMENT_TYPE_SYMBOL_STRING,
  TRANSITIONAL_ELEMENT_TYPE_SYMBOL_STRING
].includes(String(element.$$typeof));
var isValidFiber = (fiber) => typeof fiber === "object" && fiber != null && "tag" in fiber && "stateNode" in fiber && "return" in fiber && "child" in fiber && "sibling" in fiber && "flags" in fiber;
var isHostFiber = (fiber) => fiber.tag === HostComponentTag || // @ts-expect-error: it exists
fiber.tag === HostHoistableTag || // @ts-expect-error: it exists
fiber.tag === HostSingletonTag || typeof fiber.type === "string";
var isCompositeFiber = (fiber) => fiber.tag === FunctionComponentTag || fiber.tag === ClassComponentTag || fiber.tag === SimpleMemoComponentTag || fiber.tag === MemoComponentTag || fiber.tag === ForwardRefTag;
var traverseContexts = (fiber, selector) => {
  return safeTry(() => {
    const nextDependencies = fiber.dependencies;
    const prevDependencies = fiber.alternate?.dependencies;
    if (!nextDependencies || !prevDependencies) return false;
    if (typeof nextDependencies !== "object" || !("firstContext" in nextDependencies) || typeof prevDependencies !== "object" || !("firstContext" in prevDependencies)) {
      return false;
    }
    let nextContext = nextDependencies.firstContext;
    let prevContext = prevDependencies.firstContext;
    while (nextContext && typeof nextContext === "object" && "memoizedValue" in nextContext || prevContext && typeof prevContext === "object" && "memoizedValue" in prevContext) {
      if (selector(nextContext, prevContext) === true) return true;
      nextContext = nextContext?.next;
      prevContext = prevContext?.next;
    }
    return false;
  });
};
var traverseState = (fiber, selector) => {
  return safeTry(() => {
    let nextState = fiber.memoizedState;
    let prevState = fiber.alternate?.memoizedState;
    while (nextState || prevState) {
      if (selector(nextState, prevState) === true) return true;
      nextState = nextState?.next;
      prevState = prevState?.next;
    }
    return false;
  });
};
var traverseEffects = (fiber, selector) => {
  return safeTry(() => {
    let nextState = (
      // biome-ignore lint/suspicious/noExplicitAny: underlying type is unknown
      fiber.updateQueue?.lastEffect
    );
    let prevState = (
      // biome-ignore lint/suspicious/noExplicitAny: underlying type is unknown
      fiber.alternate?.updateQueue?.lastEffect
    );
    while (nextState || prevState) {
      if (selector(nextState, prevState) === true) return true;
      if (nextState?.next === nextState || prevState?.next === prevState) {
        break;
      }
      nextState = nextState?.next;
      prevState = prevState?.next;
    }
    return false;
  });
};
var traverseProps = (fiber, selector) => {
  return safeTry(() => {
    const nextProps = fiber.memoizedProps;
    const prevProps = fiber.alternate?.memoizedProps || {};
    const allKeys = /* @__PURE__ */ new Set([
      ...Object.keys(prevProps),
      ...Object.keys(nextProps)
    ]);
    for (const propName of allKeys) {
      const prevValue = prevProps?.[propName];
      const nextValue = nextProps?.[propName];
      if (selector(propName, nextValue, prevValue) === true) return true;
    }
    return false;
  });
};
var didFiberRender = (fiber) => {
  const nextProps = fiber.memoizedProps;
  const prevProps = fiber.alternate?.memoizedProps || {};
  const flags = fiber.flags ?? fiber.effectTag ?? 0;
  switch (fiber.tag) {
    case ClassComponentTag:
    case FunctionComponentTag:
    case ContextConsumerTag:
    case ForwardRefTag:
    case MemoComponentTag:
    case SimpleMemoComponentTag: {
      return (flags & PerformedWork) === PerformedWork;
    }
    default:
      if (!fiber.alternate) return true;
      return prevProps !== nextProps || fiber.alternate.memoizedState !== fiber.memoizedState || fiber.alternate.ref !== fiber.ref;
  }
};
var didFiberCommit = (fiber) => {
  return Boolean(
    (fiber.flags & (MutationMask | Cloned)) !== 0 || (fiber.subtreeFlags & (MutationMask | Cloned)) !== 0
  );
};
var getMutatedHostFibers = (fiber) => {
  const mutations = [];
  const stack = [fiber];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (isHostFiber(node) && didFiberCommit(node) && didFiberRender(node)) {
      mutations.push(node);
    }
    if (node.child) stack.push(node.child);
    if (node.sibling) stack.push(node.sibling);
  }
  return mutations;
};
var getFiberStack = (fiber) => {
  const stack = [];
  let currentFiber = fiber;
  while (currentFiber.return) {
    stack.push(currentFiber);
    currentFiber = currentFiber.return;
  }
  const newStack = new Array(stack.length);
  for (let i = 0; i < stack.length; i++) {
    newStack[i] = stack[stack.length - i - 1];
  }
  return newStack;
};
var shouldFilterFiber = (fiber) => {
  switch (fiber.tag) {
    case DehydratedSuspenseComponent:
      return true;
    case HostText:
    case Fragment:
    case LegacyHiddenComponent:
    case OffscreenComponent:
      return true;
    case HostRoot:
      return false;
    default: {
      const symbolOrNumber = typeof fiber.type === "object" && fiber.type !== null ? fiber.type.$$typeof : fiber.type;
      const typeSymbol = typeof symbolOrNumber === "symbol" ? symbolOrNumber.toString() : symbolOrNumber;
      switch (typeSymbol) {
        case CONCURRENT_MODE_NUMBER:
        case CONCURRENT_MODE_SYMBOL_STRING:
        case DEPRECATED_ASYNC_MODE_SYMBOL_STRING:
          return true;
        default:
          return false;
      }
    }
  }
};
var getNearestHostFiber = (fiber, ascending = false) => {
  let hostFiber = traverseFiber(fiber, isHostFiber, ascending);
  if (!hostFiber) {
    hostFiber = traverseFiber(fiber, isHostFiber, !ascending);
  }
  return hostFiber;
};
var getNearestHostFibers = (fiber) => {
  const hostFibers = [];
  const stack = [];
  if (isHostFiber(fiber)) {
    hostFibers.push(fiber);
  } else if (fiber.child) {
    stack.push(fiber.child);
  }
  while (stack.length) {
    const currentNode = stack.pop();
    if (!currentNode) break;
    if (isHostFiber(currentNode)) {
      hostFibers.push(currentNode);
    } else if (currentNode.child) {
      stack.push(currentNode.child);
    }
    if (currentNode.sibling) {
      stack.push(currentNode.sibling);
    }
  }
  return hostFibers;
};
var traverseFiber = (fiber, selector, ascending = false) => {
  if (!fiber) return null;
  if (selector(fiber) === true) return fiber;
  let child = ascending ? fiber.return : fiber.child;
  while (child) {
    const match = traverseFiber(child, selector, ascending);
    if (match) return match;
    child = ascending ? null : child.sibling;
  }
  return null;
};
var getTimings = (fiber) => {
  const totalTime = fiber?.actualDuration ?? 0;
  let selfTime = totalTime;
  let child = fiber?.child ?? null;
  while (totalTime > 0 && child != null) {
    selfTime -= child.actualDuration ?? 0;
    child = child.sibling;
  }
  return { selfTime, totalTime };
};
var hasMemoCache = (fiber) => {
  return Boolean(
    fiber.updateQueue?.memoCache
  );
};
var getType = (type) => {
  const currentType = type;
  if (typeof currentType === "function") {
    return currentType;
  }
  if (typeof currentType === "object" && currentType) {
    return getType(
      currentType.type || currentType.render
    );
  }
  return null;
};
var getDisplayName = (type) => {
  const currentType = type;
  if (typeof currentType !== "function" && !(typeof currentType === "object" && currentType)) {
    return null;
  }
  const name = currentType.displayName || currentType.name || null;
  if (name) return name;
  const unwrappedType = getType(currentType);
  if (!unwrappedType) return null;
  return unwrappedType.displayName || unwrappedType.name || null;
};
var isUsingRDT = () => {
  return "reactDevtoolsAgent" in getRDTHook();
};
var detectReactBuildType = (renderer) => {
  return safeTry(() => {
    if (typeof renderer.version === "string" && renderer.bundleType > 0) {
      return "development";
    }
    return "production";
  });
};
var isInstrumentationActive = () => {
  const rdtHook = getRDTHook();
  return Boolean(rdtHook._instrumentationIsActive) || isUsingRDT();
};
var fiberId = 0;
var fiberIdMap = /* @__PURE__ */ new WeakMap();
var setFiberId = (fiber, id = fiberId++) => {
  fiberIdMap.set(fiber, id);
};
var getFiberId = (fiber) => {
  let id = fiberIdMap.get(fiber);
  if (!id && fiber.alternate) {
    id = fiberIdMap.get(fiber.alternate);
  }
  if (!id) {
    id = fiberId++;
    setFiberId(fiber, id);
  }
  return id;
};
var mountFiberRecursively = (onRender, firstChild, traverseSiblings) => {
  let fiber = firstChild;
  while (fiber != null) {
    if (!fiberIdMap.has(fiber)) {
      getFiberId(fiber);
    }
    const shouldIncludeInTree = !shouldFilterFiber(fiber);
    if (shouldIncludeInTree && didFiberRender(fiber)) {
      onRender(fiber, "mount");
    }
    if (fiber.tag === SuspenseComponentTag) {
      const isTimedOut = fiber.memoizedState !== null;
      if (isTimedOut) {
        const primaryChildFragment = fiber.child;
        const fallbackChildFragment = primaryChildFragment ? primaryChildFragment.sibling : null;
        if (fallbackChildFragment) {
          const fallbackChild = fallbackChildFragment.child;
          if (fallbackChild !== null) {
            mountFiberRecursively(onRender, fallbackChild, false);
          }
        }
      } else {
        let primaryChild = null;
        if (fiber.child !== null) {
          primaryChild = fiber.child.child;
        }
        if (primaryChild !== null) {
          mountFiberRecursively(onRender, primaryChild, false);
        }
      }
    } else if (fiber.child != null) {
      mountFiberRecursively(onRender, fiber.child, true);
    }
    fiber = traverseSiblings ? fiber.sibling : null;
  }
};
var updateFiberRecursively = (onRender, nextFiber, prevFiber, parentFiber) => {
  if (!fiberIdMap.has(nextFiber)) {
    getFiberId(nextFiber);
  }
  if (!prevFiber) return;
  if (!fiberIdMap.has(prevFiber)) {
    getFiberId(prevFiber);
  }
  const isSuspense = nextFiber.tag === SuspenseComponentTag;
  const shouldIncludeInTree = !shouldFilterFiber(nextFiber);
  if (shouldIncludeInTree && didFiberRender(nextFiber)) {
    onRender(nextFiber, "update");
  }
  const prevDidTimeout = isSuspense && prevFiber.memoizedState !== null;
  const nextDidTimeOut = isSuspense && nextFiber.memoizedState !== null;
  if (prevDidTimeout && nextDidTimeOut) {
    const nextFallbackChildSet = nextFiber.child?.sibling ?? null;
    const prevFallbackChildSet = prevFiber.child?.sibling ?? null;
    if (nextFallbackChildSet !== null && prevFallbackChildSet !== null) {
      updateFiberRecursively(
        onRender,
        nextFallbackChildSet,
        prevFallbackChildSet);
    }
  } else if (prevDidTimeout && !nextDidTimeOut) {
    const nextPrimaryChildSet = nextFiber.child;
    if (nextPrimaryChildSet !== null) {
      mountFiberRecursively(onRender, nextPrimaryChildSet, true);
    }
  } else if (!prevDidTimeout && nextDidTimeOut) {
    unmountFiberChildrenRecursively(onRender, prevFiber);
    const nextFallbackChildSet = nextFiber.child?.sibling ?? null;
    if (nextFallbackChildSet !== null) {
      mountFiberRecursively(onRender, nextFallbackChildSet, true);
    }
  } else if (nextFiber.child !== prevFiber.child) {
    let nextChild = nextFiber.child;
    while (nextChild) {
      if (nextChild.alternate) {
        const prevChild = nextChild.alternate;
        updateFiberRecursively(
          onRender,
          nextChild,
          prevChild);
      } else {
        mountFiberRecursively(onRender, nextChild, false);
      }
      nextChild = nextChild.sibling;
    }
  }
};
var unmountFiber = (onRender, fiber) => {
  const isRoot = fiber.tag === HostRoot;
  if (isRoot || !shouldFilterFiber(fiber)) {
    onRender(fiber, "unmount");
  }
};
var unmountFiberChildrenRecursively = (onRender, fiber) => {
  const isTimedOutSuspense = fiber.tag === SuspenseComponentTag && fiber.memoizedState !== null;
  let child = fiber.child;
  if (isTimedOutSuspense) {
    const primaryChildFragment = fiber.child;
    const fallbackChildFragment = primaryChildFragment?.sibling ?? null;
    child = fallbackChildFragment?.child ?? null;
  }
  while (child !== null) {
    if (child.return !== null) {
      unmountFiber(onRender, child);
      unmountFiberChildrenRecursively(onRender, child);
    }
    child = child.sibling;
  }
};
var commitId = 0;
var rootInstanceMap = /* @__PURE__ */ new WeakMap();
var createFiberVisitor = ({
  onRender: onRenderWithoutState,
  onError
}) => {
  return (_rendererID, root, state) => {
    const rootFiber = "current" in root ? root.current : root;
    const onRender = (fiber, phase) => onRenderWithoutState(fiber, phase, state);
    let rootInstance = rootInstanceMap.get(root);
    if (!rootInstance) {
      rootInstance = { prevFiber: null, id: commitId++ };
      rootInstanceMap.set(root, rootInstance);
    }
    const { prevFiber } = rootInstance;
    safeTry(() => {
      if (!rootFiber) {
        unmountFiber(onRender, root);
      } else if (prevFiber !== null) {
        const wasMounted = prevFiber && prevFiber.memoizedState != null && prevFiber.memoizedState.element != null && // A dehydrated root is not considered mounted
        prevFiber.memoizedState.isDehydrated !== true;
        const isMounted = rootFiber.memoizedState != null && rootFiber.memoizedState.element != null && // A dehydrated root is not considered mounted
        rootFiber.memoizedState.isDehydrated !== true;
        if (!wasMounted && isMounted) {
          mountFiberRecursively(onRender, rootFiber, false);
        } else if (wasMounted && isMounted) {
          updateFiberRecursively(
            onRender,
            rootFiber,
            rootFiber.alternate,
            null
          );
        } else if (wasMounted && !isMounted) {
          unmountFiber(onRender, rootFiber);
        }
      } else {
        mountFiberRecursively(onRender, rootFiber, true);
      }
    }, onError);
    rootInstance.prevFiber = rootFiber;
  };
};
var instrument = (options) => {
  return getRDTHook(() => {
    const rdtHook = getRDTHook();
    options.onActive?.();
    rdtHook._instrumentationSource = options.name ?? BIPPY_INSTRUMENTATION_STRING;
    const prevOnCommitFiberRoot = rdtHook.onCommitFiberRoot;
    if (options.onCommitFiberRoot) {
      rdtHook.onCommitFiberRoot = (rendererID, root, priority) => {
        if (prevOnCommitFiberRoot)
          prevOnCommitFiberRoot(rendererID, root, priority);
        options.onCommitFiberRoot?.(rendererID, root, priority);
      };
    }
    const prevOnCommitFiberUnmount = rdtHook.onCommitFiberUnmount;
    if (options.onCommitFiberUnmount) {
      rdtHook.onCommitFiberUnmount = (rendererID, root) => {
        if (prevOnCommitFiberUnmount)
          prevOnCommitFiberUnmount(rendererID, root);
        options.onCommitFiberUnmount?.(rendererID, root);
      };
    }
    const prevOnPostCommitFiberRoot = rdtHook.onPostCommitFiberRoot;
    if (options.onPostCommitFiberRoot) {
      rdtHook.onPostCommitFiberRoot = (rendererID, root) => {
        if (prevOnPostCommitFiberRoot)
          prevOnPostCommitFiberRoot(rendererID, root);
        options.onPostCommitFiberRoot?.(rendererID, root);
      };
    }
  });
};
var secure = (options, secureOptions = {}) => {
  const onActive = options.onActive;
  const isRDTHookInstalled = hasRDTHook();
  const isRDT = isUsingRDT();
  let timeout;
  let isProduction = false;
  options.onActive = () => {
    clearTimeout(timeout);
    let isSecure = true;
    safeTry(() => {
      onActive?.();
      const rdtHook = getRDTHook();
      for (const renderer of rdtHook.renderers.values()) {
        const [majorVersion] = renderer.version.split(".");
        if (Number(majorVersion) < (secureOptions.minReactMajorVersion ?? 17)) {
          isSecure = false;
        }
        const buildType = detectReactBuildType(renderer);
        if (buildType !== "development") {
          isProduction = true;
          if (!secureOptions.dangerouslyRunInProduction) {
            isSecure = false;
          }
        }
      }
    });
    if (!isSecure) {
      options.onCommitFiberRoot = void 0;
      options.onCommitFiberUnmount = void 0;
      options.onPostCommitFiberRoot = void 0;
      options.onActive = void 0;
      return;
    }
    const onCommitFiberRoot = options.onCommitFiberRoot;
    if (onCommitFiberRoot) {
      options.onCommitFiberRoot = (rendererID, root, priority) => {
        safeTry(() => onCommitFiberRoot(rendererID, root, priority));
      };
    }
    const onCommitFiberUnmount = options.onCommitFiberUnmount;
    if (onCommitFiberUnmount) {
      options.onCommitFiberUnmount = (rendererID, root) => {
        safeTry(() => onCommitFiberUnmount(rendererID, root));
      };
    }
    const onPostCommitFiberRoot = options.onPostCommitFiberRoot;
    if (onPostCommitFiberRoot) {
      options.onPostCommitFiberRoot = (rendererID, root) => {
        safeTry(() => onPostCommitFiberRoot(rendererID, root));
      };
    }
  };
  if (!isRDTHookInstalled && !isRDT) {
    timeout = setTimeout(() => {
      if (!isProduction) {
        secureOptions.onInstallError?.();
      }
      stop();
    }, secureOptions.installCheckTimeout ?? 3e3);
  }
  return options;
};
var safeTry = (fn, onError) => {
  try {
    return fn();
  } catch (error) {
    onError?.(error);
  }
  return null;
};

export { BIPPY_INSTRUMENTATION_STRING, CONCURRENT_MODE_NUMBER, CONCURRENT_MODE_SYMBOL_STRING, ClassComponentTag, ContextConsumerTag, DEPRECATED_ASYNC_MODE_SYMBOL_STRING, DehydratedSuspenseComponent, ELEMENT_TYPE_SYMBOL_STRING, ForwardRefTag, Fragment, FunctionComponentTag, HostComponentTag, HostHoistableTag, HostRoot, HostSingletonTag, HostText, LegacyHiddenComponent, MemoComponentTag, OffscreenComponent, OffscreenComponentTag, SimpleMemoComponentTag, SuspenseComponentTag, TRANSITIONAL_ELEMENT_TYPE_SYMBOL_STRING, createFiberVisitor, detectReactBuildType, didFiberCommit, didFiberRender, fiberIdMap, getDisplayName, getFiberId, getFiberStack, getMutatedHostFibers, getNearestHostFiber, getNearestHostFibers, getRDTHook, getTimings, getType, hasMemoCache, hasRDTHook, installRDTHook, instrument, isCompositeFiber, isHostFiber, isInstrumentationActive, isUsingRDT, isValidElement, isValidFiber, mountFiberRecursively, safeTry, secure, setFiberId, shouldFilterFiber, traverseContexts, traverseEffects, traverseFiber, traverseProps, traverseState, unmountFiber, unmountFiberChildrenRecursively, updateFiberRecursively, version };
`;
