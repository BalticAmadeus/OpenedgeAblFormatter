import * as path from "path";

import { runTests } from "@vscode/test-electron";

function getIdempotencyRuns(): number {
    const cliArg = process.argv.find((arg) =>
        arg.startsWith("--idempotency-runs=")
    );
    const rawRuns = cliArg?.split("=")[1] ?? process.env.IDEMPOTENCY_RUNS;
    const parsedRuns = Number.parseInt(rawRuns ?? "2", 10);

    return Number.isFinite(parsedRuns) && parsedRuns >= 2 ? parsedRuns : 2;
}

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, "../../");
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");
        const idempotencyRuns = getIdempotencyRuns();
        const launchArgs = ["--disable-extensions"];

        launchArgs.push(`--idempotency-runs=${idempotencyRuns}`);
        process.env.TEST_MODE = "idempotency";
        process.env.IDEMPOTENCY_RUNS = String(idempotencyRuns);

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs,
            version:
                process.env.VSCODE_VERSION ||
                "1.109.5", //TODO: change to 'stable'. this is workaround for the pipeline issue, probably at some point MS will fix it and we'll be able to switch back to the latest
        });
    } catch (err) {
        console.error("Failed to run idempotency tests", err);
        process.exit(1);
    }
}

main();