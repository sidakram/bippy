export const MONO_FONT =
	"Menlo,Consolas,Monaco,Liberation Mono,Lucida Console,monospace";

export const INTERPOLATION_SPEED = 0.2;
export const lerp = (start: number, end: number) => {
	return Math.floor(start + (end - start) * INTERPOLATION_SPEED);
};

export const MAX_PARTS_LENGTH = 4;
export const MAX_LABEL_LENGTH = 40;
export const TOTAL_FRAMES = 45;

export const primaryColor = "115,97,230";
export const secondaryColor = "128,128,128";

export const getLabelText = (outlines: ActiveOutline[]): string => {
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

export const getAreaFromOutlines = (outlines: ActiveOutline[]) => {
	let area = 0;
	for (const outline of outlines) {
		area += outline.width * outline.height;
	}
	return area;
};

import type { ActiveOutline } from "./types.js";