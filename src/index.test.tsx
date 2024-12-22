import {
	createFiberVisitor,
	didFiberCommit,
	type Fiber,
	type FiberContext,
	type FiberRoot,
	getDisplayName,
	getFiberStack,
	getMutatedHostFibers,
	getNearestHostFiber,
	getNearestHostFibers,
	getRDTHook,
	getTimings,
	getType,
	instrument,
	isCompositeFiber,
	isHostFiber,
	isInstrumentationActive,
	isValidFiber,
	secure,
	traverseContexts,
	traverseFiber,
	traverseProps,
	traverseState,
} from "./index.js";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import React, { isValidElement } from "react";
import { didFiberRender } from "../dist/index.js";

const BasicComponent = () => {
	return <div>Hello</div>;
};

BasicComponent.displayName = "BasicComponent";

const BasicComponentWithEffect = () => {
	React.useEffect(() => {}, []);
	return <div>Hello</div>;
};

const BasicComponentWithUnmount = () => {
	const [shouldUnmount, setShouldUnmount] = React.useState(true);
	React.useEffect(() => {
		setShouldUnmount(false);
	}, []);
	return shouldUnmount ? <div>Hello</div> : null;
};

const BasicComponentWithMutation = () => {
	const [element, setElement] = React.useState(<div>Hello</div>);
	React.useEffect(() => {
		setElement(<div>Bye</div>);
	}, []);
	return element;
};

const BasicComponentWithChildren = ({
	children,
}: { children: React.ReactNode }) => {
	return <div>{children}</div>;
};

const BasicComponentWithMultipleElements = () => {
	return (
		<>
			<div>Hello</div>
			<div>Hello</div>
		</>
	);
};

const SlowComponent = () => {
	for (let i = 0; i < 1000000000; i++) {}
	return <div>Hello</div>;
};

const ForwardRefComponent = React.forwardRef(BasicComponent);
const MemoizedComponent = React.memo(BasicComponent);

class ClassComponent extends React.Component {
	render() {
		return <div>Hello</div>;
	}
}

const CountContext = React.createContext(0);
const ExtraContext = React.createContext(0);

const ComplexComponent = ({
	countProp = 0,
}: { countProp?: number; extraProp?: unknown }) => {
	const countContextValue = React.useContext(CountContext);
	const _extraContextValue = React.useContext(ExtraContext);
	const [countState, setCountState] = React.useState(0);
	const [_extraState, _setExtraState] = React.useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	React.useEffect(() => {
		setCountState(countState + 1);
	}, []);

	return <div>{countContextValue + countState + countProp}</div>;
};

describe("instrument", () => {
	it("should not fail if __REACT_DEVTOOLS_GLOBAL_HOOK__ exists already", () => {
		render(<BasicComponent />);
		const onCommitFiberRoot = vi.fn();
		instrument(secure({ onCommitFiberRoot }));
		render(<BasicComponent />);
		expect(onCommitFiberRoot).toHaveBeenCalled();
	});

	it("onActive is called", async () => {
		const onActive = vi.fn();
		instrument({ onActive });
		render(<BasicComponent />);
		expect(onActive).toHaveBeenCalled();
		expect(isInstrumentationActive()).toBe(true);
	});

	it("onCommitFiberRoot is called", () => {
		let currentFiberRoot: FiberRoot | null = null;
		const onCommitFiberRoot = vi.fn((_rendererID, fiberRoot) => {
			currentFiberRoot = fiberRoot;
		});
		instrument({ onCommitFiberRoot });
		expect(onCommitFiberRoot).not.toHaveBeenCalled();
		render(<BasicComponent />);
		expect(onCommitFiberRoot).toHaveBeenCalled();
		expect(currentFiberRoot?.current.child.type).toBe(BasicComponent);
	});

	it("onPostCommitFiberRoot is called", async () => {
		let currentFiberRoot: FiberRoot | null = null;
		const onPostCommitFiberRoot = vi.fn((_rendererID, fiberRoot) => {
			currentFiberRoot = fiberRoot;
		});
		instrument({ onPostCommitFiberRoot });
		expect(onPostCommitFiberRoot).not.toHaveBeenCalled();
		render(<BasicComponent />);
		expect(onPostCommitFiberRoot).not.toHaveBeenCalled();
		// onPostCommitFiberRoot only called when there is a fiber root
		render(<BasicComponentWithEffect />);
		expect(onPostCommitFiberRoot).toHaveBeenCalled();
		expect(currentFiberRoot?.current.child.type).toBe(BasicComponentWithEffect);
	});

	it("onCommitFiberUnmount is called", () => {
		let currentFiber: Fiber | null = null;
		const onCommitFiberUnmount = vi.fn((_rendererID, fiber) => {
			currentFiber = fiber;
		});
		instrument({ onCommitFiberUnmount });
		expect(onCommitFiberUnmount).not.toHaveBeenCalled();
		render(<BasicComponent />);
		expect(onCommitFiberUnmount).not.toHaveBeenCalled();
		render(<BasicComponentWithUnmount />);
		expect(onCommitFiberUnmount).toHaveBeenCalled();
		expect((currentFiber as Fiber | null)?.type).toEqual("div");
	});

	it("should safeguard if version <17 or in production", () => {
		render(<BasicComponent />);
		const rdtHook = getRDTHook();
		rdtHook.renderers.set(1, {
			version: "16.0.0",
			bundleType: 0,
		});
		const onCommitFiberRoot1 = vi.fn();
		instrument(secure({ onCommitFiberRoot: onCommitFiberRoot1 }));
		render(<BasicComponent />);
		expect(onCommitFiberRoot1).not.toHaveBeenCalled();
		instrument({
			onCommitFiberRoot: onCommitFiberRoot1,
		});
		render(<BasicComponent />);
		expect(onCommitFiberRoot1).toHaveBeenCalled();

		const onCommitFiberRoot2 = vi.fn();

		rdtHook.renderers.set(1, {
			version: "17.0.0",
			bundleType: 1,
		});
		instrument(secure({ onCommitFiberRoot: onCommitFiberRoot2 }));
		render(<BasicComponent />);
		expect(onCommitFiberRoot2).toHaveBeenCalled();
	});
});

describe("createFiberVisitor", () => {
	it("should return a fiber visitor", () => {
		const visitedFibers: Fiber[] = [];
		const visit = createFiberVisitor({
			onRender: (fiber) => {
				visitedFibers.push(fiber);
			},
			onError: (error) => {
				throw error;
			},
		});
		instrument({
			onCommitFiberRoot: (rendererID, fiberRoot) => {
				visit(rendererID, fiberRoot.current.child);
			},
		});
		render(<BasicComponentWithMutation />);
		expect(visitedFibers).toHaveLength(2);

		// TODO: investigate why the first fiber is not the mutation fiber
		expect(visitedFibers[0].type).toBe(BasicComponentWithMutation);
		expect(visitedFibers[1].type).toBe(BasicComponentWithMutation);
	});
});

describe("isValidElement", () => {
	it("should return true for a valid element", () => {
		expect(isValidElement(<div>Hello</div>)).toBe(true);
	});

	it("should return false for a non-element", () => {
		expect(isValidElement({})).toBe(false);
	});
});

describe("isValidFiber", () => {
	it("should return true for a valid fiber", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<BasicComponent />);
		expect(isValidFiber(maybeFiber as unknown as Fiber)).toBe(true);
	});

	it("should return false for a non-fiber", () => {
		expect(isValidFiber({})).toBe(false);
	});
});

describe("isHostFiber", () => {
	it("should return true for a host fiber", () => {
		let maybeHostFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeHostFiber = fiberRoot.current.child;
			},
		});
		render(<div>Hello</div>);
		expect(maybeHostFiber).not.toBeNull();
		expect(isHostFiber(maybeHostFiber as unknown as Fiber)).toBe(true);
	});

	it("should return true for a host fiber", () => {
		let maybeHostFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeHostFiber = fiberRoot.current.child;
			},
		});
		render(<BasicComponent />);
		expect(maybeHostFiber).not.toBeNull();
		expect(isHostFiber(maybeHostFiber as unknown as Fiber)).toBe(false);
	});
});

describe("isCompositeFiber", () => {
	it("should return true for a composite fiber", () => {
		let maybeCompositeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeCompositeFiber = fiberRoot.current.child;
			},
		});
		render(<BasicComponent />);
		expect(maybeCompositeFiber).not.toBeNull();
		expect(isCompositeFiber(maybeCompositeFiber as unknown as Fiber)).toBe(
			true,
		);
	});

	it("should return true for a host fiber", () => {
		let maybeCompositeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeCompositeFiber = fiberRoot.current.child;
			},
		});
		render(<div>Hello</div>);
		expect(maybeCompositeFiber).not.toBeNull();
		expect(isCompositeFiber(maybeCompositeFiber as unknown as Fiber)).toBe(
			false,
		);
	});
});

describe("didFiberRender", () => {
	it("should return true for a fiber that has rendered", () => {
		let maybeRenderedFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeRenderedFiber = fiberRoot.current.child;
			},
		});
		render(<BasicComponent />);
		expect(maybeRenderedFiber).not.toBeNull();
		expect(didFiberRender(maybeRenderedFiber as unknown as Fiber)).toBe(true);
	});

	it("should return true for a fiber that has rendered", () => {
		let maybeRenderedFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeRenderedFiber = fiberRoot.current.child;
			},
		});
		render(
			<div>
				<BasicComponentWithUnmount />
			</div>,
		);
		expect(maybeRenderedFiber).not.toBeNull();
		expect(didFiberRender(maybeRenderedFiber as unknown as Fiber)).toBe(false);
	});
});

describe("didFiberCommit", () => {
	it("should return true for a fiber that has committed", () => {
		let maybeRenderedFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeRenderedFiber = fiberRoot.current.child;
			},
		});
		render(<BasicComponentWithUnmount />);
		expect(maybeRenderedFiber).not.toBeNull();
		expect(didFiberCommit(maybeRenderedFiber as unknown as Fiber)).toBe(true);
	});

	it("should return false for a fiber that hasn't committed", () => {
		let maybeRenderedFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeRenderedFiber = fiberRoot.current.child;
			},
		});
		render(<BasicComponent />);
		expect(maybeRenderedFiber).not.toBeNull();
		expect(didFiberCommit(maybeRenderedFiber as unknown as Fiber)).toBe(false);
	});
});

describe("getMutatedHostFibers", () => {
	it("should return all host fibers that have committed and rendered", () => {
		let maybeFiber: Fiber | null = null;
		let mutatedHostFiber: Fiber<HTMLDivElement> | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
				mutatedHostFiber = fiberRoot.current.child.child;
			},
		});
		render(<BasicComponentWithMutation />);
		const mutatedHostFibers = getMutatedHostFibers(
			maybeFiber as unknown as Fiber,
		);
		expect(getMutatedHostFibers(maybeFiber as unknown as Fiber)).toHaveLength(
			1,
		);
		expect(mutatedHostFiber).toBe(mutatedHostFibers[0]);
	});
});

describe("getFiberStack", () => {
	it("should return the fiber stack", () => {
		let maybeFiber: Fiber | null = null;
		let manualFiberStack: Array<Fiber> = [];
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				manualFiberStack = [];
				maybeFiber = fiberRoot.current.child.child;
				manualFiberStack.push(fiberRoot.current.child);
				manualFiberStack.push(fiberRoot.current.child.child);
			},
		});
		render(
			<BasicComponentWithChildren>
				<BasicComponentWithUnmount />
			</BasicComponentWithChildren>,
		);
		const fiberStack = getFiberStack(maybeFiber as unknown as Fiber);
		expect(fiberStack).toEqual(manualFiberStack);
	});
});

describe("getNearestHostFiber", () => {
	it("should return the nearest host fiber", () => {
		let maybeFiber: Fiber | null = null;
		let maybeHostFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
				maybeHostFiber = fiberRoot.current.child.child;
			},
		});
		render(<BasicComponent />);
		expect(getNearestHostFiber(maybeFiber as unknown as Fiber)).toBe(
			(maybeFiber as unknown as Fiber).child,
		);
		expect(maybeHostFiber).toBe(
			getNearestHostFiber(maybeFiber as unknown as Fiber),
		);
	});

	it("should return the nearest host fiber", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<BasicComponentWithUnmount />);
		expect(getNearestHostFiber(maybeFiber as unknown as Fiber)).toBe(null);
	});
});

describe("getNearestHostFibers", () => {
	it("should return all host fibers", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<BasicComponentWithMultipleElements />);
		expect(getNearestHostFibers(maybeFiber as unknown as Fiber)).toHaveLength(
			2,
		);
	});
});

describe("getTimings", () => {
	it("should return the timings of the fiber", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<SlowComponent />);
		const timings = getTimings(maybeFiber as unknown as Fiber);
		expect(timings.selfTime).toBeGreaterThan(0);
		expect(timings.totalTime).toBeGreaterThan(0);
	});
});

describe("traverseFiber", () => {
	it("should return the nearest host fiber", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<BasicComponent />);
		expect(
			traverseFiber(
				maybeFiber as unknown as Fiber,
				(fiber) => fiber.type === "div",
			),
		).toBe((maybeFiber as unknown as Fiber)?.child);
	});
});

describe("getType", () => {
	it("should return the type of the forwardRef component", () => {
		expect(getType(ForwardRefComponent)).toBe(BasicComponent);
	});

	it("should return the type of the memoized component", () => {
		expect(getType(MemoizedComponent)).toBe(BasicComponent);
	});

	it("should return same type for a normal component", () => {
		expect(getType(BasicComponent)).toBe(BasicComponent);
	});

	it("should return the type of the class component", () => {
		expect(getType(ClassComponent)).toBe(ClassComponent);
	});

	it("should return null for a non-fiber", () => {
		expect(getType({})).toBe(null);
	});
});

describe("getDisplayName", () => {
	it("should return the displayName of the forwardRef component", () => {
		expect(getDisplayName(ForwardRefComponent)).toBe("BasicComponent");
	});

	it("should return the displayName of the memoized component", () => {
		expect(getDisplayName(MemoizedComponent)).toBe("BasicComponent");
	});

	it("should return the displayName of the component", () => {
		expect(getDisplayName(BasicComponent)).toBe("BasicComponent");
	});

	it("should return the displayName of the class component", () => {
		expect(getDisplayName(ClassComponent)).toBe("ClassComponent");
	});

	it("should return null for a non-fiber", () => {
		expect(getDisplayName({})).toBe(null);
	});
});

describe("traverseProps", () => {
	it("should return the props of the fiber", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<ComplexComponent countProp={0} />);
		const selector = vi.fn();
		traverseProps(maybeFiber as unknown as Fiber, selector);
		expect(selector).toHaveBeenCalledWith("countProp", 0, 0);
	});

	it("should stop selector at the first prop", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<ComplexComponent countProp={1} extraProp={null} />);
		const selector = vi.fn();
		traverseProps(maybeFiber as unknown as Fiber, selector);
		expect(selector).toBeCalledTimes(2);
	});

	it("should stop selector at the first prop", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<ComplexComponent countProp={1} extraProp={null} />);
		const selector = vi.fn(() => true);
		traverseProps(maybeFiber as unknown as Fiber, selector);
		expect(selector).toBeCalledTimes(1);
	});
});

describe("traverseState", () => {
	it("should return the state of the fiber", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<ComplexComponent countProp={1} />);
		const states: Array<{ next: unknown; prev: unknown }> = [];
		const selector = vi.fn((nextState, prevState) => {
			states.push({
				next: nextState.memoizedState,
				prev: prevState.memoizedState,
			});
		});
		traverseState(maybeFiber as unknown as Fiber, selector);
		expect(states[0].next).toEqual(1);
		expect(states[0].prev).toEqual(0);
		expect(states[1].next).toEqual(0);
		expect(states[1].prev).toEqual(0);
		// @ts-expect-error
		expect("deps" in states[2].next).toEqual(true);
		// @ts-expect-error
		expect("deps" in states[2].prev).toEqual(true);
	});

	it("should call selector many times for a fiber with multiple states", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<ComplexComponent countProp={1} />);
		const selector = vi.fn();
		traverseState(maybeFiber as unknown as Fiber, selector);
		expect(selector).toBeCalledTimes(3);
	});

	it("should stop selector at the first state", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<ComplexComponent countProp={1} />);
		const selector = vi.fn(() => true);
		traverseState(maybeFiber as unknown as Fiber, selector);
		expect(selector).toBeCalledTimes(1);
	});
});

describe("traverseContexts", () => {
	it("should return the contexts of the fiber", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child.child;
			},
		});
		render(
			<CountContext.Provider value={1}>
				<ComplexComponent countProp={1} />
			</CountContext.Provider>,
		);
		const contexts: FiberContext[] = [];
		const selector = vi.fn((context) => {
			contexts.push(context);
		});
		traverseContexts(maybeFiber as unknown as Fiber, selector);
		expect(contexts).toHaveLength(2);
		expect(contexts[0].context).toBe(CountContext);
		expect(contexts[0].memoizedValue).toBe(1);
		expect(contexts[1].context).toBe(ExtraContext);
		expect(contexts[1].memoizedValue).toBe(0);
	});

	it("should stop selector at the first context", () => {
		let maybeFiber: Fiber | null = null;
		instrument({
			onCommitFiberRoot: (_rendererID, fiberRoot) => {
				maybeFiber = fiberRoot.current.child;
			},
		});
		render(<ComplexComponent countProp={1} />);
		const selector = vi.fn(() => true);
		traverseContexts(maybeFiber as unknown as Fiber, selector);
		expect(selector).toBeCalledTimes(1);
	});
});
