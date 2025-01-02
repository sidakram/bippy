import { execSync } from "node:child_process";

const tryPush = () => {
	try {
		execSync("NODE_ENV=production pnpm build", { stdio: "ignore" });
		execSync("vitest --dom --run", { stdio: "ignore" });
		execSync("git add .");
		execSync('git commit --no-verify -m "bump"');
		execSync("git push");

		console.log("push at ", new Date().toLocaleString());
	} catch {}
};

tryPush();
setInterval(tryPush, 60000);
