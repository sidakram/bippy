import React from "react";
import ReactDOM from "react-dom/client";

const PROJECT = "main";

const render = async () => {
	const Component = (
		await import(
			`./${process.env.NODE_ENV !== "production" ? PROJECT : "main"}.jsx`
		)
	).default;
	ReactDOM.createRoot(document.getElementById("root")).render(<Component />);
};

render();
