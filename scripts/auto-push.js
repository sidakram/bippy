import { execSync } from "node:child_process";

const runCommand = (command) => {
	try {
		execSync(command, { stdio: "inherit" });
		return true;
	} catch {
		return false;
	}
};

const autoPush = () => {
	console.log("\n🔄 Running build and tests...");

	if (runCommand("NODE_ENV=production pnpm build")) {
		console.log("✅ Build and tests passed, pushing to GitHub...");
		runCommand("git add .");
		runCommand('git commit -m "auto: build and tests passed"');
		runCommand("git push");
		console.log("🚀 Pushed to GitHub\n");
	} else {
		console.log("❌ Build or tests failed, skipping push\n");
	}
};

console.log("🤖 Auto-push script started");
autoPush();
setInterval(autoPush, 60000);
