import * as fs from "node:fs";
import * as vscode from "vscode";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import {
    format,
    setupParserHelper,
    getStabilityTestCases,
    getTestRunDir,
    runGenericTest,
    logKnownFailures,
    isDeltaReductionEnabled,
} from "../../utils/suitesUtils";
import { ISuiteConfig } from "../../utils/ISuiteConfig";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { runDeltaReduction } from "../../utils/deltaReduct";

let parserHelper: AblParserHelper;
const deltaReductionEnabled = isDeltaReductionEnabled();

suite("Symbol Stability Test Suite", () => {
    suiteSetup(async () => {
        console.log("Symbol Test Suite setup");

        const symbolTestRunDir = getTestRunDir("symbolTests");
        fs.mkdirSync(symbolTestRunDir, { recursive: true });

        parserHelper = await setupParserHelper();

        console.log(
            "Symbol StabilityTests: ",
            getStabilityTestCases().length,
            "test cases"
        );
        console.log(
            "Symbol delta reduction:",
            deltaReductionEnabled ? "enabled" : "disabled"
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

    for (const cases of getStabilityTestCases()) {
        test(`Symbol test: ${cases}`, async () => {
            await symbolTest(cases, parserHelper);
        }).timeout(20000);
    }
});

async function symbolTest(name: string, parserHelper: AblParserHelper): Promise<void> {
    enableFormatterDecorators();

    const config: ISuiteConfig<number> = {
        testType: "symbol",
        knownFailuresFile: "_symbol_failures.txt",
        resultFailuresFile: "_symbol_failures.txt",
        processBeforeText: (text: string) => countActualSymbols(text),
        processAfterText: (text: string) => countActualSymbols(text),
        compareResults: (before: number, after: number) => before !== after,
        onMismatchAsync: async (_before: number, _after: number, fileName: string) => {
            if (!deltaReductionEnabled) {
                return;
            }

            await runDeltaReduction(name, {
                parserHelper,
                shouldKeepAsFailing: async (snippet: string) => {
                    return hasSymbolMismatch(snippet, name, parserHelper);
                },
            });
        },
    };

    await runGenericTest(name, parserHelper, config);
}

function hasSymbolMismatch(
    text: string,
    name: string,
    parserHelper: AblParserHelper
): boolean {
    const before = countActualSymbols(text);

    let afterText = text;
    try {
        afterText = format(text, name, parserHelper);
    } catch {
        // Skip snippets that cannot be formatted in isolation.
        return false;
    }

    const after = countActualSymbols(afterText);
    return before !== after;
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
