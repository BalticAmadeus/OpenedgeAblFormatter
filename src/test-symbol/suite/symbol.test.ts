import * as fs from "node:fs";
import * as vscode from "vscode";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import {
    setupParserHelper,
    stabilityTestCases,
    getTestRunDir,
    runGenericTest,
    logKnownFailures,
} from "../../utils/suitesUtils";
import { TestConfig } from "../../utils/iTestConfig";
import { AblParserHelper } from "../../parser/AblParserHelper";

let parserHelper: AblParserHelper;

suite("Symbol Stability Test Suite", () => {
    suiteSetup(async () => {
        console.log("Symbol Test Suite setup");

        const symbolTestRunDir = getTestRunDir("symbolTests");
        fs.mkdirSync(symbolTestRunDir, { recursive: true });

        parserHelper = await setupParserHelper();

        console.log(
            "Symbol StabilityTests: ",
            stabilityTestCases.length,
            "test cases"
        );

        // Log known failures count once at suite setup
        logKnownFailures("Symbol", "_symbol_failures.txt");
    });

    suiteTeardown(() => {
        if (parserHelper) {
            // Clean up parser resources if needed
            parserHelper = null as any;
        }
        vscode.window.showInformationMessage("Symbol tests done!");
    });

    for (const cases of stabilityTestCases) {
        test(`Symbol test: ${cases}`, async () => {
            await symbolTest(cases, parserHelper);
        }).timeout(10000);
    }
});

async function symbolTest(
    name: string,
    parserHelper: AblParserHelper
): Promise<void> {
    enableFormatterDecorators();

    const config: TestConfig<{ tree: any; text: string }> = {
        testType: "symbol",
        knownFailuresFile: "_symbol_failures.txt",
        resultFailuresFile: "_symbol_failures.txt",
        processBeforeText: async (text: string) => ({
            tree: null,
            text: countActualSymbols(text).toString(),
        }),
        processAfterText: async (text: string) => ({
            tree: null,
            text: countActualSymbols(text).toString(),
        }),
        compareResults: async (before, after) => before.text !== after.text,
    };

    await runGenericTest(name, parserHelper, config);
}

function countActualSymbols(text: string): number {
    let count = 0;

    for (const element of text) {
        const char = element;
        // Exclude spaces, newlines, carriage returns, and tabs
        if (char !== " " && char !== "\n" && char !== "\r" && char !== "\t") {
            count++;
        }
    }

    return count;
}
