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

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath: extensionTestsPath,
            version: process.env.VSCODE_VERSION || "1.97.2", //TODO: change to 'stable'. this is workaround for the pipeline issue, probably at some point MS will fix it and we'll be able to switch back to the latest
        });
    } catch (err) {
        console.error("Failed to run symbol tests", err);
        process.exit(1);
    }
}

main();
