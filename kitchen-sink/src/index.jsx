import React from "react";
import ReactDOM from "react-dom/client";

const PROJECT = "owner-tree-test";

const render = async () => {
	const Component = (
		await import(
			`./${process.env.NODE_ENV !== "production" ? PROJECT : "mini-react-scan"}.jsx`
		)
	).default;
	ReactDOM.createRoot(document.getElementById("root")).render(<Component />);
};

render();
