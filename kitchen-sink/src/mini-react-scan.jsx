import { instrument, getNearestHostFiber, createFiberVisitor } from "bippy"; // must be imported BEFORE react
import React, { useState } from "react";

const highlightFiber = (fiber) => {
	if (!(fiber.stateNode instanceof HTMLElement)) return;

	const rect = fiber.stateNode.getBoundingClientRect();
	const highlight = document.createElement("div");
	highlight.style.border = "1px solid red";
	highlight.style.position = "fixed";
	highlight.style.top = `${rect.top}px`;
	highlight.style.left = `${rect.left}px`;
	highlight.style.width = `${rect.width}px`;
	highlight.style.height = `${rect.height}px`;
	highlight.style.zIndex = 999999999;
	document.documentElement.appendChild(highlight);
	setTimeout(() => {
		document.documentElement.removeChild(highlight);
	}, 100);
};

const visit = createFiberVisitor({
	onRender(fiber) {
		const hostFiber = getNearestHostFiber(fiber);
		highlightFiber(hostFiber);
	},
});

instrument({
	onCommitFiberRoot(rendererID, root) {
		visit(rendererID, root);
	},
});

export default function TodoList() {
	const [todos, setTodos] = useState([]);
	const [input, setInput] = useState("");

	const addTodo = () => {
		if (!input.trim()) return;
		setTodos([...todos, { text: input, completed: false }]);
		setInput("");
	};

	const toggleComplete = (index) => {
		setTodos(
			todos.map((todo, i) =>
				i === index ? { ...todo, completed: !todo.completed } : todo,
			),
		);
	};

	const deleteTodo = (index) => {
		setTodos(todos.filter((_, i) => i !== index));
	};

	React.useEffect(() => {
		console.log("useEffect");
	}, []);

	return (
		<div>
			<h2>Todo List</h2>
			<input
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && addTodo()}
			/>
			<button type="button" onClick={addTodo}>
				Add Todo
			</button>
			<ul>
				{todos.map((todo, index) => (
					<li key={todo.id}>
						<span
							onClick={() => toggleComplete(index)}
							onKeyDown={(e) => e.key === "Enter" && toggleComplete(index)}
							style={{
								textDecoration: todo.completed ? "line-through" : "none",
								cursor: "pointer",
							}}
						>
							{todo.text}
						</span>
						<button type="button" onClick={() => deleteTodo(index)}>
							Delete
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
