import { execSync } from "node:child_process";

const tryPush = () => {
	try {
		execSync("NODE_ENV=production pnpm build", { stdio: "inherit" });
		execSync("vitest --dom --run", { stdio: "inherit" });
		execSync("git add .");
		execSync('git commit -m "bump"');
		execSync("git push");
		console.log("push at ", new Date().toLocaleString());
	} catch {}
};

tryPush();
setInterval(tryPush, 60000);
