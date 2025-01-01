import { OUTLINE_VIEW_SIZE } from "./const.js";
import type { ActiveOutline } from "./types.js";

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let dpr = 1;

const activeOutlines: Map<string, ActiveOutline> = new Map();

const primaryColor = "115,97,230";
const secondaryColor = "128,128,128";

let animationFrameId: number | null = null;

const MONO_FONT =
	"Menlo,Consolas,Monaco,Liberation Mono,Lucida Console,monospace";

const INTERPOLATION_SPEED = 0.2;
const lerp = (start: number, end: number) => {
	return Math.floor(start + (end - start) * INTERPOLATION_SPEED);
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

function draw() {
	if (!ctx || !canvas) return;

	ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

	const groupedOutlinesMap = new Map<string, ActiveOutline[]>();
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
		if (targetX !== x) {
			outline.x = lerp(x, targetX);
		}
		if (targetY !== y) {
			outline.y = lerp(y, targetY);
		}

		// not sure if lerping these is necessary
		if (targetWidth !== width) {
			outline.width = lerp(width, targetWidth);
		}
		if (targetHeight !== height) {
			outline.height = lerp(height, targetHeight);
		}

		const labelKey = `${targetX ?? x},${targetY ?? y}`;
		const rectKey = `${labelKey},${targetWidth ?? width},${targetHeight ?? height}`;

		const outlines = groupedOutlinesMap.get(labelKey);
		if (outlines) {
			outlines.push(outline);
		} else {
			groupedOutlinesMap.set(labelKey, [outline]);
		}

		const alpha = 1 - frame / TOTAL_FRAMES;
		outline.frame++;

		console.log(outline.didCommit);
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

	for (const rect of rectMap.values()) {
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

	const labelMap = new Map<
		string,
		{
			text: string;
			width: number;
			height: number;
			alpha: number;
			x: number;
			y: number;
			outlines: ActiveOutline[];
		}
	>();

	ctx.textRendering = "optimizeSpeed";

	for (const outlines of groupedOutlinesMap.values()) {
		const first = outlines[0];
		const { x, y, frame } = first;
		const alpha = 1 - frame / TOTAL_FRAMES;
		const text = getLabelText(outlines);
		const { width } = ctx.measureText(text);
		const height = 11;
		labelMap.set(`${x},${y},${width},${text}`, {
			text,
			width,
			height,
			alpha,
			x,
			y,
			outlines,
		});

		let labelY: number = y - height - 4;

		if (labelY < 0) {
			labelY = 0;
		}

		if (frame > TOTAL_FRAMES) {
			for (const outline of outlines) {
				activeOutlines.delete(String(outline.id));
			}
		}
	}

	// // merge labels that are overlapping
	// const sortedLabels = Array.from(labelMap.entries()).sort(
	// 	([_, a], [__, b]) => {
	// 		// Sort by total area of outlines
	// 		const areaA = a.outlines.reduce((sum, o) => sum + o.width * o.height, 0);
	// 		const areaB = b.outlines.reduce((sum, o) => sum + o.width * o.height, 0);
	// 		return areaB - areaA; // Bigger areas first
	// 	},
	// );

	// for (const [labelKey, label] of sortedLabels) {
	// 	if (!labelMap.has(labelKey)) continue; // Skip if already merged

	// 	for (const [otherKey, otherLabel] of labelMap.entries()) {
	// 		if (labelKey === otherKey) continue;

	// 		const { x, y, width, height } = label;
	// 		const {
	// 			x: otherX,
	// 			y: otherY,
	// 			width: otherWidth,
	// 			height: otherHeight,
	// 		} = otherLabel;

	// 		if (
	// 			x + width > otherX &&
	// 			otherX + otherWidth > x &&
	// 			y + height > otherY &&
	// 			otherY + otherHeight > y
	// 		) {
	// 			label.text = getLabelText([...label.outlines, ...otherLabel.outlines]);
	// 			label.width = ctx.measureText(label.text).width;
	// 			labelMap.delete(otherKey);
	// 		}
	// 	}
	// }

	// for (const label of labelMap.values()) {
	// 	const { x, y, alpha, width, height, text } = label;

	// 	let labelY: number = y - height - 4;

	// 	if (labelY < 0) {
	// 		labelY = 0;
	// 	}

	// 	ctx.fillStyle = `rgba(${primaryColor},${alpha})`;
	// 	ctx.fillRect(x, labelY, width + 4, height + 4);

	// 	ctx.fillStyle = `rgba(255,255,255,${alpha})`;
	// 	ctx.fillText(text, x + 2, labelY + height);
	// }

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
			// outline.x = newX;
			// outline.y = newY;
		}
	}
};
