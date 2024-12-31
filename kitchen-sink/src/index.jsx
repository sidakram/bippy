import React from "react";
import ReactDOM from "react-dom/client";
import "./main.css";

const PROJECT = "playground";

const render = async () => {
	const Component = (
		await import(
			process.env.NODE_ENV !== "production" ? `./${PROJECT}.jsx` : "./main.jsx"
		)
	).default;
	ReactDOM.createRoot(document.getElementById("root")).render(<Component />);
};

render();
