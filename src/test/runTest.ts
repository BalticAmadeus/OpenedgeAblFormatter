import * as path from "path";

import { runTests } from "@vscode/test-electron";

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, "../../");

        // Check for `--metamorphic` flag
        const isMetamorphic = process.argv.includes("--metamorphic");

        // Optional: Pass this flag to your extension via env var or launchArgs
        const launchArgs = ["--disable-extensions"];

        if (isMetamorphic) {
            console.log("DEBUG");
            launchArgs.push("--metamorphic");
            process.env.TEST_MODE = "metamorphic";
        }

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");

        // Use pinned version from env to avoid hardcoded Electron path issues on macOS arm64
        const vscodeVersion = process.env.VSCODE_VERSION || "1.109.5";
        console.log(`[runTest] VS Code version: ${vscodeVersion}`);

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs,
            version: vscodeVersion,
        });
    } catch (err) {
        console.error("Failed to run tests", err);
        process.exit(1);
    }
}

main();
