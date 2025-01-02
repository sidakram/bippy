import {
	createFiberVisitor,
	didFiberCommit,
	getDisplayName,
	getFiberId,
	getNearestHostFibers,
	instrument,
	isCompositeFiber,
	secure,
} from "../index.js";
import type {
	Fiber,
	FiberMetadata,
	PendingOutline,
	ActiveOutline,
} from "./types.js";
// @ts-expect-error OK
import Worker from "./canvas.worker.js";
import { OUTLINE_VIEW_SIZE } from "./const.js";
import {
	drawCanvas,
	updateOutlines,
	updateScroll,
	initCanvas,
	resizeCanvas,
	type OutlineData,
} from "./canvas.utils.js";

let worker: Worker | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let dpr = 1;
let animationFrameId: number | null = null;
const activeOutlines = new Map<string, ActiveOutline>();

const fiberMap = new WeakMap<Fiber, FiberMetadata>();
const fiberMapKeys = new Set<Fiber>();

export const pushOutline = (fiber: Fiber) => {
	if (!isCompositeFiber(fiber)) return;
	const name =
		typeof fiber.type === "string" ? fiber.type : getDisplayName(fiber);
	if (!name) return;
	const fiberMetadata = fiberMap.get(fiber);
	const nearestFibers = getNearestHostFibers(fiber);

	const didCommit = didFiberCommit(fiber);

	if (!fiberMetadata) {
		fiberMap.set(fiber, {
			name,
			count: 1,
			elements: nearestFibers.map((fiber) => fiber.stateNode),
			didCommit: didCommit ? 1 : 0,
		});
		fiberMapKeys.add(fiber);
	} else {
		fiberMetadata.count++;
	}
};

const mergeRects = (rects: DOMRect[]) => {
	const firstRect = rects[0];
	if (rects.length === 1) return firstRect;

	let minX: number | undefined;
	let minY: number | undefined;
	let maxX: number | undefined;
	let maxY: number | undefined;

	for (let i = 0, len = rects.length; i < len; i++) {
		const rect = rects[i];
		minX = minX == null ? rect.x : Math.min(minX, rect.x);
		minY = minY == null ? rect.y : Math.min(minY, rect.y);
		maxX =
			maxX == null ? rect.x + rect.width : Math.max(maxX, rect.x + rect.width);
		maxY =
			maxY == null
				? rect.y + rect.height
				: Math.max(maxY, rect.y + rect.height);
	}

	if (minX == null || minY == null || maxX == null || maxY == null) {
		return rects[0];
	}

	return new DOMRect(minX, minY, maxX - minX, maxY - minY);
};

export const getRect = (
	elements: Element[],
): Promise<Map<Element, DOMRect>> => {
	return new Promise((resolve) => {
		const rects = new Map<Element, DOMRect>();
		const observer = new IntersectionObserver((entries) => {
			for (let i = 0, len = entries.length; i < len; i++) {
				const entry = entries[i];
				const element = entry.target;
				const rect = entry.boundingClientRect;
				if (entry.isIntersecting && rect.width && rect.height) {
					rects.set(element, rect);
				}
			}
			observer.disconnect();
			resolve(rects);
		});

		for (let i = 0, len = elements.length; i < len; i++) {
			const element = elements[i];
			observer.observe(element);
		}
	});
};

export const flushOutlines = async () => {
	const outlines: PendingOutline[] = [];
	const elements: Element[] = [];

	for (const fiber of fiberMapKeys) {
		const outline = fiberMap.get(fiber);
		if (!outline) continue;
		for (let i = 0; i < outline.elements.length; i++) {
			elements.push(outline.elements[i]);
		}
	}

	const rectsMap = await getRect(elements);

	for (const fiber of fiberMapKeys) {
		const outline = fiberMap.get(fiber);
		if (!outline) continue;
		const rects: DOMRect[] = [];
		for (let i = 0; i < outline.elements.length; i++) {
			const element = outline.elements[i];
			const rect = rectsMap.get(element);
			if (!rect) continue;
			rects.push(rect);
		}
		fiberMap.delete(fiber);
		fiberMapKeys.delete(fiber);
		if (!rects.length) continue;
		const { x, y, width, height } = mergeRects(rects);

		outlines.push({
			name: outline.name,
			data: [
				getFiberId(fiber),
				outline.count,
				x,
				y,
				width,
				height,
				outline.didCommit,
			],
		});
	}

	const SupportedArrayBuffer =
		typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

	const data = new SupportedArrayBuffer(
		outlines.length * OUTLINE_VIEW_SIZE * 4,
	);
	const sharedView = new Float32Array(data);

	const names = new Array(outlines.length);
	const outlineData: OutlineData[] = [];

	for (let i = 0; i < outlines.length; i++) {
		const { data, name } = outlines[i];
		const [id, count, x, y, width, height, didCommit] = data;
		const adjustedIndex = i * OUTLINE_VIEW_SIZE;
		sharedView[adjustedIndex] = id;
		sharedView[adjustedIndex + 1] = count;
		sharedView[adjustedIndex + 2] = x;
		sharedView[adjustedIndex + 3] = y;
		sharedView[adjustedIndex + 4] = width;
		sharedView[adjustedIndex + 5] = height;
		sharedView[adjustedIndex + 6] = didCommit;
		names[i] = name;
		outlineData.push({
			id,
			name,
			count,
			x,
			y,
			width,
			height,
			didCommit: didCommit as 0 | 1,
		});
	}

	if (worker) {
		worker.postMessage({
			type: "draw-outlines",
			data,
			names,
		});
	} else if (canvas && ctx) {
		updateOutlines(activeOutlines, outlineData);
		if (!animationFrameId) {
			animationFrameId = requestAnimationFrame(draw);
		}
	}
};

const draw = () => {
	if (!ctx || !canvas) return;

	const shouldContinue = drawCanvas(ctx, canvas, dpr, activeOutlines);

	if (shouldContinue) {
		animationFrameId = requestAnimationFrame(draw);
	} else {
		animationFrameId = null;
	}
};

const CANVAS_HTML_STR = `<canvas style="position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646" aria-hidden="true"></canvas>`;

const initWorker = (canvasEl: HTMLCanvasElement, dpr: number) => {
	try {
		worker = Worker();
		const offscreenCanvas = canvasEl.transferControlToOffscreen();

		worker.postMessage(
			{
				type: "init",
				canvas: offscreenCanvas,
				width: canvasEl.width,
				height: canvasEl.height,
				dpr,
			},
			[offscreenCanvas],
		);

		return true;
	} catch (e) {
		console.warn(
			"React Scan: Web Worker or OffscreenCanvas not available, falling back to normal canvas",
			e,
		);
		return false;
	}
};

export const getCanvasEl = () => {
	const host = document.createElement("div");
	host.setAttribute("data-react-scan", "true");
	const shadowRoot = host.attachShadow({ mode: "open" });

	shadowRoot.innerHTML = CANVAS_HTML_STR;
	const canvasEl = shadowRoot.firstChild as HTMLCanvasElement;
	if (!canvasEl) return null;

	dpr = Math.min(window.devicePixelRatio || 1, 2);
	canvas = canvasEl;

	const { innerWidth, innerHeight } = window;
	canvasEl.style.width = `${innerWidth}px`;
	canvasEl.style.height = `${innerHeight}px`;
	const width = innerWidth * dpr;
	const height = innerHeight * dpr;
	canvasEl.width = width;
	canvasEl.height = height;

	const workerInitialized = initWorker(canvasEl, dpr);
	if (!workerInitialized) {
		ctx = initCanvas(canvasEl, dpr);
		if (!ctx) return null;
		resizeCanvas(canvasEl, ctx, dpr);
	}

	let isResizeScheduled = false;
	window.addEventListener("resize", () => {
		if (!isResizeScheduled) {
			isResizeScheduled = true;
			setTimeout(() => {
				if (!ctx) return;
				if (worker) {
					const { width, height } = resizeCanvas(canvasEl, ctx, dpr);
					worker.postMessage({
						type: "resize",
						width,
						height,
						dpr,
					});
				} else {
					resizeCanvas(canvasEl, ctx, dpr);
					draw();
				}
				isResizeScheduled = false;
			});
		}
	});

	let prevScrollX = window.scrollX;
	let prevScrollY = window.scrollY;
	let isScrollScheduled = false;
	window.addEventListener("scroll", () => {
		if (!isScrollScheduled) {
			isScrollScheduled = true;
			setTimeout(() => {
				const { scrollX, scrollY } = window;
				const deltaX = scrollX - prevScrollX;
				const deltaY = scrollY - prevScrollY;
				prevScrollX = scrollX;
				prevScrollY = scrollY;
				if (worker) {
					worker.postMessage({
						type: "scroll",
						deltaX,
						deltaY,
					});
				} else if (ctx) {
					updateScroll(activeOutlines, deltaX, deltaY);
				}
				isScrollScheduled = false;
			}, 16 * 2);
		}
	});

	setInterval(() => {
		if (fiberMapKeys.size) {
			flushOutlines();
		}
	}, 16 * 2);

	shadowRoot.appendChild(canvasEl);
	return host;
};

export const hasStopped = () => {
	return globalThis.__REACT_SCAN_STOP__;
};

export const stop = () => {
	globalThis.__REACT_SCAN_STOP__ = true;
	cleanup();
};

let hasCleanedUp = false;
export const cleanup = () => {
	if (hasCleanedUp) return;
	hasCleanedUp = true;
	const host = document.querySelector("[data-react-scan]");
	if (host) {
		host.remove();
	}
};

const init = () => {
	cleanup();
	if (hasStopped()) return;

	const visit = createFiberVisitor({
		onRender(fiber) {
			pushOutline(fiber);
		},
		onError() {},
	});

	instrument(
		secure(
			{
				onActive() {
					if (hasStopped()) return;
					const host = getCanvasEl();
					if (host) {
						document.documentElement.appendChild(host);
					}
				},
				onCommitFiberRoot(rendererID, root) {
					if (hasStopped()) return cleanup();
					visit(rendererID, root);
				},
			},
			{
				dangerouslyRunInProduction: true,
				onInstallError() {
					console.warn(
						"React Scan did not install correctly.\n\n{link to install doc}",
					);
				},
			},
		),
	);
};

if (typeof window !== "undefined") {
	init();
}
