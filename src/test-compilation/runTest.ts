import * as path from "path";
import { runTests } from "@vscode/test-electron";

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, "../../");

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");

        // Pin VS Code version from env to avoid downloading latest, which can break
        // macOS arm64 by resolving to an Electron path that doesn't exist at the expected location.
        const vscodeVersion = process.env.VSCODE_VERSION || "1.109.5";
        console.log("Running Compilation Tests...");
        console.log(`VS Code version: ${vscodeVersion}`);
        console.log(`Extension Development Path: ${extensionDevelopmentPath}`);
        console.log(`Extension Tests Path: ${extensionTestsPath}`);

        await runTests({ extensionDevelopmentPath, extensionTestsPath, version: vscodeVersion });
        console.log("✓ All compilation tests completed successfully");
    } catch (err) {
        console.error("❌ Failed to run compilation tests:", err);
        process.exit(1);
    }
}

main();
