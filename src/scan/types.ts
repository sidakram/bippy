import type { Fiber as ReactFiber } from "../index.js";

export type Fiber = ReactFiber<Element>;

export interface PendingOutline {
	name: string;
	data: InlineOutlineData;
}

export type InlineOutlineData = [
	/**
	 * id
	 */
	number,
	/**
	 * count
	 */
	number,
	/**
	 * x
	 */
	number,
	/**
	 * y
	 */
	number,
	/**
	 * width
	 */
	number,
	/**
	 * height
	 */
	number,
];

export interface ActiveOutline {
	id: number;
	name: string;
	count: number;
	x: number;
	y: number;
	width: number;
	height: number;
	frame: number;
}

export interface FiberMetadata {
	name: string;
	count: number;
	elements: Element[];
}
