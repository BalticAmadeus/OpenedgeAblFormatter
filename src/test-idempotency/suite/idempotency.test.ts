import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import {
    addFailedTestCase,
    format,
    getFailedTestCases,
    getInput,
    isDeltaReductionEnabled,
    getSettingsOverride,
    getStabilityTestCases,
    getTestRunDir,
    logKnownFailures,
    setupParserHelper,
} from "../../utils/suitesUtils";
import { runDeltaReduction } from "../../utils/deltaReduct";

let parserHelper: AblParserHelper;
const extensionDevelopmentPath = path.resolve(__dirname, "../../../");
const resultFailuresFile = "_idempotency_failures.txt";
const idempotencyTestCases = getStabilityTestCases();

suite("Idempotency Test Suite", () => {
    suiteSetup(async () => {
        console.log("Idempotency Test Suite setup");

        const idempotencyTestRunDir = getTestRunDir("idempotencyTests");
        fs.mkdirSync(idempotencyTestRunDir, { recursive: true });

        parserHelper = await setupParserHelper();

        console.log(
            "Idempotency StabilityTests: ",
            idempotencyTestCases.length,
            "test cases",
        );

        logKnownFailures("Idempotency", resultFailuresFile);
    });

    for (const cases of idempotencyTestCases) {
        test(`Idempotency test: ${cases}`, async () => {
            await idempotencyTest(cases, parserHelper);
        }).timeout(20000);
    }
});

async function idempotencyTest(name: string, parserHelper: AblParserHelper): Promise<void> {
    enableFormatterDecorators();

    const idempotencyRuns = getIdempotencyRuns();
    const testRunDir = getTestRunDir("idempotencyTests");
    const knownFailures = getFailedTestCases(
        path.join(extensionDevelopmentPath, "resources/stabilityTests"),
        resultFailuresFile,
    );
    const fileName = name.replaceAll(/[\s/\\:*?"<>|]+/g, "_");
    const baseInput = getSettingsOverride(true) + getInput(name);

    let previousResult = baseInput;
    writePassResult(testRunDir, fileName, 0, previousResult);

    for (let iteration = 1; iteration <= idempotencyRuns; iteration++) {
        const currentResult = format(previousResult, name, parserHelper);
        writePassResult(testRunDir, fileName, iteration, currentResult);

        if (currentResult !== previousResult) {
            if (knownFailures.includes(fileName)) {
                console.log("Known issue");
                return;
            }

            if (isDeltaReductionEnabled()) {
                // Skip delta reduction for specific problematic files
                const skipDeltaReduction = fileName.includes("_dimextent.p") ||
                 fileName.includes("_s-alert2.p") || fileName.includes("_s-join.p") || fileName.includes("s-zap.p") ||
                  fileName.includes("s-write.p") || fileName.includes("gat_fnm.p") || fileName.includes("mss_pul.p") ||
                   fileName.includes("mss_typ.p") || fileName.includes("rankpdb.p") || fileName.includes("ora_lk0.p");
                if (skipDeltaReduction) {
                    console.log(`Skipping delta reduction for file ${fileName}`);
                    return;
                }
                await runDeltaReduction(name, {
                    parserHelper,
                    shouldKeepAsFailing: skipDeltaReduction
                        ? async () => true
                        : async (snippet: string) => {
                            return hasIdempotencyMismatch(snippet, name, parserHelper);
                        },
                });
            }

            addFailedTestCase(testRunDir, resultFailuresFile, fileName);
            assert.fail(
                [
                    `Idempotency mismatch after pass ${iteration} for ${name}`,
                    `Before: ${path.join(
                        testRunDir,
                        `${fileName}_pass_${iteration - 1}.p`,
                    )}`,
                    `After: ${path.join(
                        testRunDir,
                        `${fileName}_pass_${iteration}.p`,
                    )}`,
                ].join("\n"),
            );
        }

        previousResult = currentResult;
    }

    if (knownFailures.includes(fileName)) {
        addFailedTestCase(testRunDir, "_new_passes.txt", fileName);
        assert.fail(`File should fail ${fileName}`);
    }
}

function hasIdempotencyMismatch(
    text: string,
    name: string,
    parserHelper: AblParserHelper
): boolean {
    try {
        const first = format(text, name, parserHelper);
        const second = format(first, name, parserHelper);
        return first !== second;
    } catch {
        return false;
    }
}

function writePassResult(
    testRunDir: string,
    fileName: string,
    iteration: number,
    resultText: string,
): void {
    const passFilePath = path.join(
        testRunDir,
        `${fileName}_pass_${iteration}.p`,
    );
    fs.writeFileSync(passFilePath, resultText, "utf-8");
}

function getIdempotencyRuns(): number {
    const cliArg = process.argv.find((arg) =>
        arg.startsWith("--idempotency-runs="),
    );
    const rawRuns = cliArg?.split("=")[1] ?? process.env.IDEMPOTENCY_RUNS;
    const parsedRuns = Number.parseInt(rawRuns ?? "2", 10);

    return Number.isFinite(parsedRuns) && parsedRuns >= 2 ? parsedRuns : 2;
}
