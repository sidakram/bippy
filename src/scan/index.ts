import {
	createFiberVisitor,
	getDisplayName,
	getFiberId,
	getNearestHostFibers,
	instrument,
	isCompositeFiber,
} from "../index.js";
import type { Fiber, FiberMetadata, PendingOutline } from "./types.js";
// @ts-expect-error OK
import Worker from "./canvas.worker.js";

const canvasHtmlStr = `<canvas style="position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646" aria-hidden="true"></canvas>`;
let worker: Worker;

const fiberMap = new WeakMap<Fiber, FiberMetadata>();
const fiberMapKeys = new Set<Fiber>();

export const pushOutline = (fiber: Fiber) => {
	if (!isCompositeFiber(fiber)) return;
	const name =
		typeof fiber.type === "string" ? fiber.type : getDisplayName(fiber);
	if (!name) return;
	const fiberMetadata = fiberMap.get(fiber);
	const nearestFibers = getNearestHostFibers(fiber);
	if (!fiberMetadata) {
		fiberMap.set(fiber, {
			name,
			count: 1,
			elements: nearestFibers.map((fiber) => fiber.stateNode),
		});
		fiberMapKeys.add(fiber);
	} else {
		fiberMetadata.count++;
	}
};

const mergeRects = (rects: DOMRect[]) => {
	const minX = Math.min(...rects.map((rect) => rect.x));
	const minY = Math.min(...rects.map((rect) => rect.y));
	const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
	const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
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
		const { x, y, width, height } =
			rects.length === 1 ? rects[0] : mergeRects(rects);

		outlines.push({
			name: outline.name,
			data: [
				getFiberId(fiber),
				outline.count,
				Math.floor(x),
				Math.floor(y),
				Math.floor(width),
				Math.floor(height),
			],
		});
	}

	const SupportedArrayBuffer =
		typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer;

	const data = new SupportedArrayBuffer(outlines.length * 6 * 4);
	const sharedView = new Float32Array(data);

	const names = new Array(outlines.length);

	for (let i = 0; i < outlines.length; i++) {
		const { data, name } = outlines[i];
		const [id, count, x, y, width, height] = data;
		const adjustedIndex = i * 6;
		sharedView[adjustedIndex] = id;
		sharedView[adjustedIndex + 1] = count;
		sharedView[adjustedIndex + 2] = x;
		sharedView[adjustedIndex + 3] = y;
		sharedView[adjustedIndex + 4] = width;
		sharedView[adjustedIndex + 5] = height;
		names[i] = name;
	}

	worker.postMessage({
		type: "draw",
		data,
		names,
	});
};

export const getCanvasEl = () => {
	const host = document.createElement("div");
	host.setAttribute("data-bippy-scan", "true");
	const shadowRoot = host.attachShadow({ mode: "open" });

	shadowRoot.innerHTML = canvasHtmlStr;
	const canvasEl = shadowRoot.firstChild as HTMLCanvasElement;
	if (!canvasEl) return null;

	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	worker = Worker();

	let isResizeScheduled = false;
	const updateCanvasSize = () => {
		const { innerWidth, innerHeight } = window;
		canvasEl.style.width = `${innerWidth}px`;
		canvasEl.style.height = `${innerHeight}px`;
		return {
			width: innerWidth * dpr,
			height: innerHeight * dpr,
		};
	};

	window.addEventListener("resize", () => {
		if (!isResizeScheduled) {
			isResizeScheduled = true;
			setTimeout(() => {
				const { width, height } = updateCanvasSize();
				worker.postMessage({
					type: "resize",
					width,
					height,
					dpr,
				});
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
				worker.postMessage({
					type: "scroll",
					deltaX,
					deltaY,
				});
				isScrollScheduled = false;
			}, 16 * 2);
		}
	});

	const { width, height } = updateCanvasSize();
	const offscreenCanvas = canvasEl.transferControlToOffscreen();

	worker.postMessage(
		{
			type: "init",
			canvas: offscreenCanvas,
			width,
			height,
			dpr,
		},
		[offscreenCanvas],
	);
	setInterval(() => {
		if (fiberMapKeys.size) {
			// adding a rAF here makes everything slow
			flushOutlines();
		}
	}, 16 * 2);

	const visit = createFiberVisitor({
		onRender(fiber) {
			pushOutline(fiber);
		},
		onError() {},
	});

	instrument({
		onCommitFiberRoot(rendererID, root) {
			visit(rendererID, root);
		},
	});

	shadowRoot.appendChild(canvasEl);
	return host;
};

if (typeof window !== "undefined") {
	const host = getCanvasEl();
	if (host) {
		document.body.insertBefore(host, document.body.firstChild);
	}
}
