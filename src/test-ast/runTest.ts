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

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath: extensionTestsPath,
            launchArgs,
            version: process.env.VSCODE_VERSION || "1.109.5", //TODO: change to 'stable'. this is workaround for the pipeline issue, probably at some point MS will fix it and we'll be able to switch back to the latest
        });
    } catch (err) {
        console.error("\n❌ Failed to run AST tests");
        console.error(err);
        console.error(
            "\n💡 TIP: If tests show '0 passing', AST test data may be missing.",
        );
        console.error("   Run: npm run get-ade-test");
        console.error(
            "   This clones the Progress ADE repository with test files.\n",
        );
        process.exit(1);
    }
}

main();
