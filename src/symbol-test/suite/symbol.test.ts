import * as fs from "fs";
import * as vscode from "vscode";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import {
    setupParserHelper,
    stabilityTestCases,
    testRunDir,
    runGenericTest,
    TestConfig,
    logKnownFailures,
} from "../../utils/suitesUtils";
import { AblParserHelper } from "../../parser/AblParserHelper";

let parserHelper: AblParserHelper;

suite("Symbol Stability Test Suite", () => {
    suiteSetup(async () => {
        console.log("Symbol Test Suite setup");
        fs.mkdirSync(testRunDir, { recursive: true });
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

    stabilityTestCases.forEach((cases) => {
        test(`Symbol test: ${cases}`, () => {
            symbolTest(cases, parserHelper);
        }).timeout(10000);
    });
});

function symbolTest(name: string, parserHelper: AblParserHelper): void {
    enableFormatterDecorators();

    const config: TestConfig<number> = {
        testType: "symbol",
        knownFailuresFile: "_symbol_failures.txt",
        resultFailuresFile: "_symbol_failures.txt",
        processBeforeText: (text: string) => countActualSymbols(text),
        processAfterText: (text: string) => countActualSymbols(text),
        compareResults: (before: number, after: number) => before !== after,
    };

    runGenericTest(name, parserHelper, config);
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
