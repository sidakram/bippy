import type { ActiveOutline } from "./types.js";

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let dpr = 1;

const activeOutlines: Map<string, ActiveOutline> = new Map();

const color = { r: 115, g: 97, b: 230 };

let animationFrameId: number | null = null;

const MONO_FONT =
	"Menlo,Consolas,Monaco,Liberation Mono,Lucida Console,monospace";

const INTERPOLATION_SPEED = 0.2;
const lerp = (start: number, end: number) => {
	return start + (end - start) * INTERPOLATION_SPEED;
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

const getLabelText = (outlines: ActiveOutline[]): string => {
	const parts: string[] = [];
	for (const outline of outlines) {
		const { name, count } = outline;
		parts.push(count > 1 ? `${name} ×${count}` : name);
	}
	return parts.join(", ");
};

const TOTAL_FRAMES = 45;

function draw() {
	if (!ctx || !canvas) return;

	ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
	// ctx.save();

	// const alphaScalar = 0.8;
	//   invariantActiveOutline.alpha =
	//     alphaScalar * (1 - frame / invariantActiveOutline.totalFrames);

	//   const alpha = invariantActiveOutline.alpha;
	//   const fillAlpha = alpha * 0.1;

	const labelMap = new Map<string, ActiveOutline[]>();

	for (const outline of activeOutlines.values()) {
		if (outline.targetX !== undefined) {
			outline.x = lerp(outline.x, outline.targetX);
			if (outline.targetX === outline.x) {
				outline.targetX = undefined;
			}
		}
		if (outline.targetY !== undefined) {
			outline.y = lerp(outline.y, outline.targetY);
			if (outline.targetY === outline.y) {
				outline.targetY = undefined;
			}
		}
		if (outline.targetWidth !== undefined) {
			outline.width = lerp(outline.width, outline.targetWidth);
			if (outline.targetWidth === outline.width) {
				outline.targetWidth = undefined;
			}
		}
		if (outline.targetHeight !== undefined) {
			outline.height = lerp(outline.height, outline.targetHeight);
			if (outline.targetHeight === outline.height) {
				outline.targetHeight = undefined;
			}
		}

		const { x, y, width, height, frame } = outline;
		const alpha = 1 - frame / TOTAL_FRAMES;
		const fillAlpha = alpha * 0.1;

		const rgb = `${color.r},${color.g},${color.b}`;
		ctx.strokeStyle = `rgba(${rgb},${alpha})`;
		ctx.lineWidth = 1;
		ctx.fillStyle = `rgba(${rgb},${fillAlpha})`;

		ctx.beginPath();
		ctx.rect(x, y, width, height);
		ctx.stroke();
		ctx.fill();
		outline.frame++;

		const labelKey = `${x},${y}`;
		const group = labelMap.get(labelKey);
		if (group) {
			group.push(outline);
		} else {
			labelMap.set(labelKey, [outline]);
		}
		// slow?
	}

	// ctx.restore();

	// ctx.save();
	ctx.font = `11px ${MONO_FONT}`;

	for (const outlines of labelMap.values()) {
		const first = outlines[0];
		const { x, y, frame } = first;
		const alpha = 1 - frame / TOTAL_FRAMES;
		const text = getLabelText(outlines);

		const textMetrics = ctx.measureText(text);
		const textWidth = textMetrics.width;
		const textHeight = 11;

		const labelX: number = x;
		const labelY: number = y - textHeight - 4;

		ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
		ctx.fillRect(labelX, labelY, textWidth + 4, textHeight + 4);

		ctx.fillStyle = `rgba(255,255,255,${alpha})`;
		ctx.fillText(text, labelX + 2, labelY + textHeight);

		if (frame > TOTAL_FRAMES) {
			for (const o of outlines) {
				activeOutlines.delete(String(o.id));
			}
		}
	}

	// ctx.restore();

	if (activeOutlines.size) {
		animationFrameId = requestAnimationFrame(() => draw());
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
};
