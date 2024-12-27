import type { CompressedPendingOutline, ActiveOutline } from "./types.js";

// Use separate functions for keys if we're dealing with both Compressed and Active outlines:
function getCompressedOutlineKey(outline: CompressedPendingOutline): string {
	const [name, , x, y, width, height] = outline;
	return `${name},${x},${y},${width},${height}`;
}

function getActiveOutlineKey(outline: ActiveOutline): string {
	const { name, x, y, width, height } = outline;
	return `${name},${x},${y},${width},${height}`;
}

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let dpr = 1;

let pendingOutlines: CompressedPendingOutline[] = [];
const activeOutlines: Map<string, ActiveOutline> = new Map();

const color = { r: 115, g: 97, b: 230 };

let animationFrameId: number | null = null;

const MONO_FONT =
	"Menlo,Consolas,Monaco,Liberation Mono,Lucida Console,monospace";

const getOverlapArea = (rect1: DOMRect, rect2: DOMRect): number => {
	if (rect1.right <= rect2.left || rect2.right <= rect1.left) {
		return 0;
	}

	if (rect1.bottom <= rect2.top || rect2.bottom <= rect1.top) {
		return 0;
	}

	const xOverlap =
		Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left);
	const yOverlap =
		Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top);

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

// Convert compressed outline to an ActiveOutline
function toActiveOutline(c: CompressedPendingOutline): ActiveOutline {
	return {
		id: c[0],
		name: c[1],
		count: c[2],
		x: c[3],
		y: c[4],
		width: c[5],
		height: c[6],
		frame: 0,
	};
}

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

	// dedupe overlapping outlines
	for (const outlines of labelMap.values()) {
		const first = outlines[0];
		const { x, y, frame } = first;
		const alpha = 1 - frame / TOTAL_FRAMES;
		const text = getLabelText(outlines);

		const textMetrics = ctx.measureText(text);
		const textWidth = textMetrics.width;
		const textHeight = 11;
	}

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
				activeOutlines.delete(getActiveOutlineKey(o));
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
		if (!animationFrameId) {
			animationFrameId = requestAnimationFrame(() => draw());
		}
	}

	if (type === "draw") {
		const { outlinesBuffer, names } = event.data;
		const floatView = new Float32Array(outlinesBuffer);
		const newOutlines: CompressedPendingOutline[] = [];

		for (let i = 0; i < floatView.length; i += 6) {
			newOutlines.push([
				floatView[i],
				names[i / 6],
				floatView[i + 1],
				floatView[i + 2],
				floatView[i + 3],
				floatView[i + 4],
				floatView[i + 5],
			]);
		}

		pendingOutlines = newOutlines;
		if (!animationFrameId) {
			animationFrameId = requestAnimationFrame(() => {
				for (const c of pendingOutlines) {
					const key = getCompressedOutlineKey(c);
					const existingOutline = activeOutlines.get(key);
					if (existingOutline) {
						existingOutline.count++;
					} else {
						activeOutlines.set(key, toActiveOutline(c));
					}
				}
				pendingOutlines = [];
				draw();
			});
		} else {
			for (const c of pendingOutlines) {
				const key = getCompressedOutlineKey(c);
				const existingOutline = activeOutlines.get(key);
				if (existingOutline) {
					existingOutline.count++;
					existingOutline.frame = 0;
				} else {
					activeOutlines.set(key, toActiveOutline(c));
				}
			}
		}
	}
};
