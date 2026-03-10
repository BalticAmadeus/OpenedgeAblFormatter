import * as fs from "fs";
import * as os from "os";
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
        // NOTE: On Windows, VS Code integration tests can fail with
        // "Error: Error mutex already exists" if a previous test run is still
        // alive or if a shared user-data-dir is used. Using fresh dirs per run
        // avoids the collision without requiring users to kill processes.
        const launchArgs = ["--disable-extensions"];

        const testUserDataDir = fs.mkdtempSync(
            path.join(os.tmpdir(), "openedge-abl-formatter-test-userdata-")
        );
        const testExtensionsDir = fs.mkdtempSync(
            path.join(os.tmpdir(), "openedge-abl-formatter-test-extensions-")
        );

        launchArgs.push(`--user-data-dir=${testUserDataDir}`);
        launchArgs.push(`--extensions-dir=${testExtensionsDir}`);

        if (isMetamorphic) {
            console.log("DEBUG");
            launchArgs.push("--metamorphic");
            process.env.TEST_MODE = "metamorphic";
        }

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs,
        });
    } catch (err) {
        console.error("Failed to run tests", err);
        process.exit(1);
    }
}

main();
