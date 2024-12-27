import {
	createFiberVisitor,
	getDisplayName,
	getFiberId,
	getNearestHostFibers,
	instrument,
	isCompositeFiber,
} from "../index.js";
import type {
	CompressedPendingOutline,
	Fiber,
	FiberMetadata,
} from "./types.js";

const canvasHtmlStr = `<canvas style="position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646" aria-hidden="true"></canvas>`;
let worker: Worker;

const fiberIdMap = new WeakMap<Fiber, number>();
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
				console.log(entry.intersectionRatio);
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
	const outlines: CompressedPendingOutline[] = [];
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

		outlines.push([
			getFiberId(fiber),
			outline.name,
			outline.count,
			x,
			y,
			width,
			height,
		]);
	}

	const buffer = new (
		typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : ArrayBuffer
	)(outlines.length * 6 * 4);
	const sharedView = new Float32Array(buffer);

	for (let i = 0; i < outlines.length; i++) {
		const [id, _name, count, x, y, width, height] = outlines[i];
		sharedView[i * 6 + 0] = id;
		sharedView[i * 6 + 1] = count;
		sharedView[i * 6 + 2] = x;
		sharedView[i * 6 + 3] = y;
		sharedView[i * 6 + 4] = width;
		sharedView[i * 6 + 5] = height;
	}

	worker.postMessage({
		type: "draw",
		outlinesBuffer: buffer,
		names: outlines.map(([_id, name]) => name),
	});
};

export const getCanvasEl = () => {
	const host = document.createElement("div");
	host.setAttribute("data-bippy-scan", "true");
	const shadowRoot = host.attachShadow({ mode: "open" });

	shadowRoot.innerHTML = canvasHtmlStr;
	const canvasEl = shadowRoot.firstChild as HTMLCanvasElement;
	if (!canvasEl) return null;

	const dpr = window.devicePixelRatio || 1;
	worker = new Worker(new URL("./worker.js", import.meta.url));

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
			requestAnimationFrame(() => {
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

	window.addEventListener("scroll", () => {
		requestAnimationFrame(() => {
			// TODO: adjust rects
			flushOutlines();
		});
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
