import { useEffect, useState } from "react";
import "./main.css";
import { getRDTHook, getDisplayName, traverseFiber } from "bippy";
import { Inspector } from "../node_modules/react-inspector/dist/index";

export const getFiberFromElement = (element) => {
	const { renderers } = getRDTHook();
	for (const [_, renderer] of Array.from(renderers || [])) {
		try {
			const fiber = renderer.findFiberByHostInstance(element);
			if (fiber) return fiber;
		} catch {}
	}

	if ("_reactRootContainer" in element) {
		return element._reactRootContainer?._internalRoot?.current?.child;
	}

	for (const key in element) {
		if (
			key.startsWith("__reactInternalInstance$") ||
			key.startsWith("__reactFiber")
		) {
			return element[key];
		}
	}
	return null;
};

const throttle = (fn, wait) => {
	let timeout;
	return (...args) => {
		if (!timeout) {
			timeout = setTimeout(() => {
				fn(...args);
				timeout = null;
			}, wait);
		}
	};
};

export const HoverOverlay = () => {
	const [fiber, setFiber] = useState(null);
	const [rect, setRect] = useState(null);
	useEffect(() => {
		const handleMouseMove = throttle((event) => {
			if (window.innerWidth < 800) {
				setFiber(null);
				setRect(null);
				return;
			}
			const element = document.elementFromPoint(event.clientX, event.clientY);
			const fiber = getFiberFromElement(element);
			let foundInspect = false;
			traverseFiber(
				fiber,
				(innerFiber) => {
					if (innerFiber.type === Inspector) {
						foundInspect = true;
						return true;
					}
				},
				true,
			);
			traverseFiber(fiber, (innerFiber) => {
				if (innerFiber.type === Inspector) {
					foundInspect = true;
					return true;
				}
			});
			if (foundInspect) return;
			setFiber(fiber?.return || fiber);
			setRect(element.getBoundingClientRect());
		}, 16);
		document.addEventListener("mousemove", handleMouseMove);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	if (window.innerWidth < 800 || !fiber || !rect) return null;

	return (
		<>
			<div
				className="border border-black fixed bg-white z-50 p-[1ch] max-w-[50ch] transition-all duration-150 overflow-auto max-h-[40ch]"
				style={{
					top: rect?.top,
					left: rect?.left + rect?.width,
					opacity: rect ? 1 : 0,
					transform: rect ? "translateY(0)" : "translateY(10px)",
					pointerEvents: rect ? "auto" : "none",
				}}
			>
				<Text
					as="h3"
					className="text-sm mb-[1ch] bg-neutral-100 px-[0.5ch] rounded-sm w-fit"
				>
					{`<${typeof fiber?.type === "string" ? fiber?.type : getDisplayName(fiber) || "unknown"}>`}
				</Text>
				<Inspector data={fiber} expandLevel={1} />
			</div>
			<div
				style={{
					left: rect?.left,
					top: rect?.top,
					width: rect?.width,
					height: rect?.height,
					opacity: rect ? 1 : 0,
				}}
				className="border border-neutral-400 border-dashed fixed z-40 pointer-events-none transition-all duration-150"
			/>
		</>
	);
};

function cn(...args) {
	return args.filter(Boolean).join(" ");
}

function SideLayout({ children }) {
	return (
		<div className="relative leading-normal pl-[2ch] pt-[1lh] pr-[2ch] sm:pt-[2lh] sm:pl-[7ch] min-h-[100dvh] pb-[1lh] sm:max-w-[80ch]">
			{children}
		</div>
	);
}

function Text({ as = "p", children, className, ...props }) {
	const As = as;
	return (
		<As className={cn("text-lg", className)} {...props}>
			{children}
		</As>
	);
}

function Link({ children, className, href, ...props }) {
	return (
		<a
			href={href}
			className={cn("underline hover:bg-black hover:text-white", className)}
			{...props}
		>
			{children}
		</a>
	);
}

function List({ children }) {
	return (
		<ul className="pl-[1ch] list-disc marker:content-['→'] marker:text-neutral-400 marker:pr-[1ch] space-y-[1ch]">
			{children}
		</ul>
	);
}

function ListItem({ children }) {
	return <li className="pl-[1ch]">{children}</li>;
}

export default function Main() {
	return (
		<>
			<HoverOverlay />
			<SideLayout>
				<div className="flex items-center gap-[1ch]">
					<div className="flex items-center gap-[0.5ch]">
						<img
							src="/bippy.png"
							alt="bippy logo"
							className="w-[30px] h-[30px] animate-spin"
							width={30}
							height={30}
						/>
						<Text className="font-bold" as="h1">
							bippy
						</Text>
					</div>
					<Link href="https://github.com/aidenybai/bippy">
						<Text as="span">{__VERSION__}</Text>
					</Link>
				</div>
				<div className="flex items-center gap-[1ch]">
					<Text className="text-muted-foreground">
						hack into react internals
					</Text>
				</div>

				<hr className="my-[1ch] border-neutral-200" />

				<div className="flex flex-col gap-[1ch] my-[1ch]">
					<Text className="text-muted-foreground">
						bippy attempts to solve two problems:
					</Text>
				</div>

				<List>
					<ListItem>
						<Text className="text-muted-foreground">
							it's not possible to write instrumentation for React without the
							end user changing code
						</Text>
					</ListItem>
					<ListItem>
						<Text className="text-muted-foreground">
							doing anything useful with fibers requires you to know react
							source code very well
						</Text>
					</ListItem>
				</List>

				<div className="flex flex-col gap-[1ch] my-[1ch]">
					<Text className="text-muted-foreground">
						bippy allows you to access fiber information from outside of react
						and provides friendly low-level utils for interacting with fibers.
					</Text>
				</div>

				<div className="flex flex-col gap-[1ch] my-[1ch]">
					<Text className="text-muted-foreground">
						<Link href="https://github.com/aidenybai/bippy">
							{">"} view source
						</Link>
					</Text>
				</div>

				<div className="bg-black text-white p-[1ch] my-[2ch]">
					<div>
						<Text className="text-xs">
							⚠️⚠️⚠️{" "}
							<Text as="span" className="text-xs">
								this project may break production apps and cause unexpected
								behavior
							</Text>{" "}
							⚠️⚠️⚠️
						</Text>
					</div>
					<div className="mt-[1ch]">
						<Text className="text-xs">
							this project uses react internals, which can change at any time.
							it is not recommended to depend on internals unless you really,{" "}
							<Text as="span" className="text-xs italic">
								really have to.
							</Text>{" "}
							by proceeding, you acknowledge the risk of breaking your own code
							or apps that use your code.
						</Text>
					</div>
				</div>
			</SideLayout>
		</>
	);
}
