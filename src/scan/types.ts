import type { Fiber as ReactFiber } from "../index.js";

export type Fiber = ReactFiber<Element>;

export type CompressedPendingOutline = [
	/**
	 * name
	 */
	string,
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
