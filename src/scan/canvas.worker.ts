import { OUTLINE_VIEW_SIZE } from "./const.js";
import type { ActiveOutline } from "./types.js";
import { drawCanvas } from "./canvas.utils.js";

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let dpr = 1;

const activeOutlines: Map<string, ActiveOutline> = new Map();
let animationFrameId: number | null = null;

self.onmessage = (event) => {
	const { type } = event.data;

	if (type === "init") {
		canvas = event.data.canvas;
		dpr = event.data.dpr;

		if (canvas) {
			canvas.width = event.data.width;
			canvas.height = event.data.height;
			ctx = canvas.getContext("2d", { alpha: true });

			if (ctx) {
				ctx.scale(dpr, dpr);
			}
		}
	}

	if (!canvas || !ctx) return;

	if (type === "resize") {
		canvas.width = event.data.width;
		canvas.height = event.data.height;
		ctx.resetTransform();
		ctx.scale(dpr, dpr);
		draw();

		return;
	}

	if (type === "draw-outlines") {
		const { data, names } = event.data;

		const floatView = new Float32Array(data);
		for (let i = 0; i < floatView.length; i += OUTLINE_VIEW_SIZE) {
			const x = floatView[i + 2];
			const y = floatView[i + 3];
			const width = floatView[i + 4];
			const height = floatView[i + 5];
			const didCommit = floatView[i + 6] as 0 | 1;
			const outline = {
				id: floatView[i],
				name: names[i / OUTLINE_VIEW_SIZE],
				count: floatView[i + 1],
				x,
				y,
				width,
				height,
				frame: 0,
				targetX: x,
				targetY: y,
				targetWidth: width,
				targetHeight: height,
				didCommit,
			};
			const key = String(outline.id);

			const existingOutline = activeOutlines.get(key);
			if (existingOutline) {
				existingOutline.count++;
				existingOutline.frame = 0;
				existingOutline.targetX = x;
				existingOutline.targetY = y;
				existingOutline.targetWidth = width;
				existingOutline.targetHeight = height;
				existingOutline.didCommit = didCommit;
			} else {
				activeOutlines.set(key, outline);
			}
		}

		if (!animationFrameId) {
			animationFrameId = requestAnimationFrame(draw);
		}

		return;
	}

	if (type === "scroll") {
		const { deltaX, deltaY } = event.data;
		for (const outline of activeOutlines.values()) {
			const newX = outline.x - deltaX;
			const newY = outline.y - deltaY;
			outline.targetX = newX;
			outline.targetY = newY;
		}
	}
};

function draw() {
	if (!ctx || !canvas) return;

	const shouldContinue = drawCanvas(ctx, canvas, dpr, activeOutlines);

	if (shouldContinue) {
		animationFrameId = requestAnimationFrame(draw);
	} else {
		animationFrameId = null;
	}
}
