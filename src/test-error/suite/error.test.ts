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
import { ISuiteConfig } from "../../utils/ISuiteConfig";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { SyntaxNode, Tree } from "web-tree-sitter";
import { FileIdentifier } from "../../model/FileIdentifier";
import * as assert from "node:assert";

let parserHelper: AblParserHelper;
let totalErrors: number = 0;

suite("Error Stability Test Suite", () => {
    suiteSetup(async () => {
        console.log("Error Test Suite setup");

        const errorTestRunDir = getTestRunDir("errorTests");
        fs.mkdirSync(errorTestRunDir, { recursive: true });

        parserHelper = await setupParserHelper();

        console.log(
            "Error StabilityTests: ",
            stabilityTestCases.length,
            "test cases"
        );

        // Log known failures count once at suite setup
        logKnownFailures("Error", "_error_failures.txt");
    });

    suiteTeardown(() => {
        if (parserHelper) {
            // Clean up parser resources if needed
            parserHelper = null as any;
        }
        vscode.window.showInformationMessage("Error tests done!");
        console.log("Number of Errors in total:", totalErrors);
    });

    for (const cases of stabilityTestCases) {
        test(`Erorr test: ${cases}`, async () => {
            await errorTest(cases, parserHelper);
        }).timeout(20000);
    }

    test(`Erorr test: SUM`, async () => {
        assert.equal(totalErrors, 69420);
    }).timeout(20000);
});

async function errorTest(
    name: string,
    parserHelper: AblParserHelper
): Promise<void> {
    enableFormatterDecorators();

    const configErrorsBeforeFormatting: ISuiteConfig<{
        tree: Tree | undefined;
        text: string;
        errorCount: number;
    }> = {
        testType: "error",
        knownFailuresFile: "_error_failures.txt",
        resultFailuresFile: "_error_failures.txt",
        processBeforeText: async (
            text: string,
            parserHelper: AblParserHelper
        ) => {
            const tree = await generateAst(text, parserHelper);
            if (tree === undefined) {
                return { tree: undefined, text: text, errorCount: 0 };
            } else {
                return {
                    tree: undefined,
                    text: text,
                    errorCount: countErrors(tree),
                };
            }
        },
        processAfterText: async (
            text: string,
            parserHelper: AblParserHelper
        ) => {
            return {
                tree: undefined,
                text: text,
                errorCount: 0,
            };
        },
        compareResults: async (before, after) =>
            before.errorCount !== after.errorCount,
    };

    await runGenericTest(name, parserHelper, configErrorsBeforeFormatting);
}

function countErrors(tree: Tree): number {
    const count = iterateAndCountErrors(tree.rootNode);

    console.log("Count", count);

    totalErrors += count;
    return count;
}

function iterateAndCountErrors(syntaxNode: SyntaxNode): number {
    let count = 0;

    for (let i = 0; i < syntaxNode.childCount; i++) {
        if (
            syntaxNode.children[i].type.toLowerCase() === "error" &&
            syntaxNode.type.toLowerCase() !== "on_error_phrase" &&
            syntaxNode.type.toLowerCase() !== "no-error"
        ) {
            count++;
        }
        count += iterateAndCountErrors(syntaxNode.children[i]);
    }

    return count;
}

async function generateAst(
    text: string,
    parserHelper: AblParserHelper
): Promise<Tree | undefined> {
    const result = await parserHelper.parseAsync(
        new FileIdentifier("test", 1),
        text
    );
    return result.tree;
}
