import type { ActiveOutline } from "./types.js";

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let dpr = 1;

const activeOutlines: Map<string, ActiveOutline> = new Map();

const primaryColor = "115,97,230";
const secondaryColor = "255,255,255";

let animationFrameId: number | null = null;

const MONO_FONT =
	"Menlo,Consolas,Monaco,Liberation Mono,Lucida Console,monospace";

const INTERPOLATION_SPEED = 0.2;
const lerp = (start: number, end: number) => {
	return Math.floor(start + (end - start) * INTERPOLATION_SPEED);
};

const getOverlapArea = (
	outline1: ActiveOutline,
	outline2: ActiveOutline,
): number => {
	if (
		outline1.x + outline1.width <= outline2.x ||
		outline2.x + outline2.width <= outline1.x
	) {
		return 0;
	}

	if (
		outline1.y + outline1.height <= outline2.y ||
		outline2.y + outline2.height <= outline1.y
	) {
		return 0;
	}

	const xOverlap =
		Math.min(outline1.x + outline1.width, outline2.x + outline2.width) -
		Math.max(outline1.x, outline2.x);
	const yOverlap =
		Math.min(outline1.y + outline1.height, outline2.y + outline2.height) -
		Math.max(outline1.y, outline2.y);

	return xOverlap * yOverlap;
};

const MAX_PARTS_LENGTH = 4;
const MAX_LABEL_LENGTH = 40;

const getLabelText = (outlines: ActiveOutline[]): string => {
	const nameByCount = new Map<string, number>();
	for (const outline of outlines) {
		const { name, count } = outline;
		nameByCount.set(name, (nameByCount.get(name) || 0) + count);
	}

	const countByNames = new Map<number, string[]>();
	for (const [name, count] of nameByCount.entries()) {
		const names = countByNames.get(count);
		if (names) {
			names.push(name);
		} else {
			countByNames.set(count, [name]);
		}
	}

	const partsEntries = Array.from(countByNames.entries()).sort(
		([countA], [countB]) => countB - countA,
	);
	const partsLength = partsEntries.length;
	let labelText = "";
	for (let i = 0; i < partsLength; i++) {
		const [count, names] = partsEntries[i];
		let part = `${names.slice(0, MAX_PARTS_LENGTH).join(", ")} ×${count}`;
		if (part.length > MAX_LABEL_LENGTH) {
			part = `${part.slice(0, MAX_LABEL_LENGTH)}…`;
		}
		if (i !== partsLength - 1) {
			part += ", ";
		}
		labelText += part;
	}

	if (labelText.length > MAX_LABEL_LENGTH) {
		return `${labelText.slice(0, MAX_LABEL_LENGTH)}…`;
	}

	return labelText;
};

const TOTAL_FRAMES = 45;

const isRectWithin = (rect1: ActiveOutline, rect2: ActiveOutline): boolean => {
	return (
		rect1.x + rect1.width <= rect2.x + rect2.width &&
		rect2.x + rect2.width <= rect1.x + rect1.width &&
		rect1.y + rect1.height <= rect2.y + rect2.height &&
		rect2.y + rect2.height <= rect1.y + rect1.height
	);
};

function draw() {
	if (!ctx || !canvas) return;

	ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

	const labelMap = new Map<string, ActiveOutline[]>();
	const rectMap = new Map<
		string,
		{
			x: number;
			y: number;
			width: number;
			height: number;
			alpha: number;
		}
	>();

	for (const outline of activeOutlines.values()) {
		const {
			x,
			y,
			width,
			height,
			targetX,
			targetY,
			targetWidth,
			targetHeight,
			frame,
		} = outline;
		// if (targetX !== undefined) {
		// 	outline.x = lerp(x, targetX);
		// 	if (targetX === outline.x) {
		// 		outline.targetX = undefined;
		// 	}
		// }
		// if (targetY !== undefined) {
		// 	outline.y = lerp(y, targetY);
		// 	if (targetY === y) {
		// 		outline.targetY = undefined;
		// 	}
		// }
		// if (targetWidth !== undefined) {
		// 	outline.width = lerp(width, targetWidth);
		// 	if (targetWidth === width) {
		// 		outline.targetWidth = undefined;
		// 	}
		// }
		// if (targetHeight !== undefined) {
		// 	outline.height = lerp(height, targetHeight);
		// 	if (targetHeight === height) {
		// 		outline.targetHeight = undefined;
		// 	}
		// }

		const labelKey = `${targetX ?? x},${targetY ?? y}`;
		const rectKey = `${labelKey},${targetWidth ?? width},${targetHeight ?? height}`;

		const outlines = labelMap.get(labelKey);
		if (outlines) {
			outlines.push(outline);
		} else {
			labelMap.set(labelKey, [outline]);
		}

		const alpha = 1 - frame / TOTAL_FRAMES;
		outline.frame++;

		const rect = rectMap.get(rectKey) || {
			x,
			y,
			width,
			height,
			alpha,
		};
		if (alpha > rect.alpha) {
			rect.alpha = alpha;
		}
		rectMap.set(rectKey, rect);
	}

	for (const rect of Array.from(rectMap.values()).reverse()) {
		const { x, y, width, height, alpha } = rect;
		ctx.strokeStyle = `rgba(${primaryColor},${alpha})`;
		ctx.lineWidth = 1;

		ctx.beginPath();
		ctx.rect(x, y, width, height);
		ctx.stroke();
		ctx.fillStyle = `rgba(${primaryColor},${alpha * 0.1})`;
		ctx.fill();
	}

	ctx.font = `11px ${MONO_FONT}`;

	// TODO: move out the text measuring to a separate for loop, check overlaps, and then re-draw the merged text
	// check why there's so many rect overlaps (fills?)

	for (const outlines of labelMap.values()) {
		const first = outlines[0];
		const { x, y, frame } = first;
		const alpha = 1 - frame / TOTAL_FRAMES;
		const text = getLabelText(outlines);

		ctx.textRendering = "optimizeSpeed";

		const textMetrics = ctx.measureText(text);
		const textWidth = textMetrics.width;
		const textHeight = 11;

		let labelY: number = y - textHeight - 4;

		if (labelY < 0) {
			labelY = 0;
		}

		ctx.fillStyle = `rgba(${primaryColor},${alpha})`;
		ctx.fillRect(x, labelY, textWidth + 4, textHeight + 4);

		ctx.fillStyle = `rgba(255,255,255,${alpha})`;
		ctx.fillText(text, x + 2, labelY + textHeight);

		if (frame > TOTAL_FRAMES) {
			for (const outline of outlines) {
				activeOutlines.delete(String(outline.id));
			}
		}
	}

	if (activeOutlines.size) {
		animationFrameId = requestAnimationFrame(draw);
	} else {
		animationFrameId = null;
	}
}

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

	if (type === "draw") {
		const { data, names } = event.data;

		const floatView = new Float32Array(data);
		for (let i = 0; i < floatView.length; i += 6) {
			const outline = {
				id: floatView[i],
				name: names[i / 6],
				count: floatView[i + 1],
				x: floatView[i + 2],
				y: floatView[i + 3],
				width: floatView[i + 4],
				height: floatView[i + 5],
				frame: 0,
			};
			const key = String(outline.id);

			const existingOutline = activeOutlines.get(key);
			if (existingOutline) {
				existingOutline.count++;
				existingOutline.frame = 0;
				existingOutline.targetX = outline.x;
				existingOutline.targetY = outline.y;
				existingOutline.targetWidth = outline.width;
				existingOutline.targetHeight = outline.height;
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
			outline.targetX = outline.x - deltaX;
			outline.targetY = outline.y - deltaY;
		}
	}
};
