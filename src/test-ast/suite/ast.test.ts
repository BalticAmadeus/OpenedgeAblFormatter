import * as fs from "node:fs";
import * as vscode from "vscode";
import { join } from "node:path";
import { Tree, SyntaxNode } from "web-tree-sitter";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import {
    setupParserHelper,
    stabilityTestCases,
    getTestRunDir,
    runGenericTest,
    logKnownFailures,
    setupMetamorphicEngine,
    setMetamorphicFormattingEngine,
    runMetamorphicSuite,
} from "../../utils/suitesUtils";
import { TestConfig } from "../../utils/iTestConfig";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { ConfigurationManager } from "../../utils/ConfigurationManager";
import { ReplaceEQ } from "../../mtest/mrs/ReplaceEQ";
import { ReplaceForEachToForLast } from "../../mtest/mrs/ReplaceForEachToForLast";
import { RemoveNoError } from "../../mtest/mrs/RemoveNoError";

let parserHelper: AblParserHelper;

const isMetamorphicEnabled =
    process.argv.includes("--metamorphic") ||
    process.env.TEST_MODE === "metamorphic";

const metamorphicEngine = setupMetamorphicEngine(isMetamorphicEnabled, [
    new ReplaceEQ(),
    new ReplaceForEachToForLast(),
    new RemoveNoError(),
]);

suite("AST Stability Test Suite", () => {
    suiteSetup(async () => {
        console.log("AST Test Suite setup");

        const astTestRunDir = getTestRunDir("astTests");
        fs.mkdirSync(astTestRunDir, { recursive: true });

        parserHelper = await setupParserHelper();
        setMetamorphicFormattingEngine(metamorphicEngine, parserHelper);

        console.log(
            "AST StabilityTests: ",
            stabilityTestCases.length,
            "test cases"
        );

        // Log known failures count once at suite setup
        logKnownFailures("AST", "_ast_failures.txt");
    });

    suiteTeardown(() => {
        runMetamorphicSuite(metamorphicEngine, "Metamorphic AST Tests");

        if (parserHelper) {
            // Clean up parser resources if needed
            parserHelper = null as any;
        }
        vscode.window.showInformationMessage("AST tests done!");
    });

    for (const cases of stabilityTestCases) {
        test(`AST test: ${cases}`, async () => {
            await astTest(cases, parserHelper);
        }).timeout(10000);
    }
});

async function astTest(
    name: string,
    parserHelper: AblParserHelper
): Promise<void> {
    enableFormatterDecorators();

    const config: TestConfig<{ tree: Tree | undefined; text: string }> = {
        testType: "ast",
        knownFailuresFile: "_ast_failures.txt",
        resultFailuresFile: "_ast_failures.txt",
        processBeforeText: async (
            text: string,
            parserHelper: AblParserHelper
        ) => {
            const tree = await generateAst(text, parserHelper);
            return { tree, text };
        },
        processAfterText: async (
            text: string,
            parserHelper: AblParserHelper
        ) => {
            const tree = await generateAst(text, parserHelper);
            return { tree, text };
        },
        compareResults: async (
            before: { tree: Tree | undefined; text: string },
            after: { tree: Tree | undefined; text: string },
            _parserHelper?: AblParserHelper
        ) => {
            if (!before.tree || !after.tree) {
                return false;
            }
            const options = ConfigurationManager.getInstance().getAll();

            try {
                const areEqual = await (_parserHelper || parserHelper).compare(
                    before.text,
                    after.text,
                    { settings: options }
                );
                return !areEqual;
            } catch (err) {
                console.error("Worker compare failed:", err);
                return true; // treat error as mismatch
            }
        },
        onMismatch: (
            before: { tree: Tree | undefined; text: string },
            after: { tree: Tree | undefined; text: string },
            fileName: string
        ) => {
            if (
                before &&
                after &&
                before.tree !== undefined &&
                after.tree !== undefined
            ) {
                analyzeAstDifferences(before.tree, after.tree, fileName);
            }
        },
        cleanup: (
            before: {
                [x: string]: any;
                tree: Tree | undefined;
                text: string;
            },
            after: {
                [x: string]: any;
                tree: Tree | undefined;
                text: string;
            }
        ) => {
            if (typeof before?.tree?.delete === "function") {
                before.tree.delete();
            }
            if (
                typeof after?.tree?.delete === "function"
            ) {
                after.tree.delete();
            }
        },
    };

    await runGenericTest(name, parserHelper, config, metamorphicEngine);
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

function analyzeAstDifferences(
    beforeAst: Tree,
    afterAst: Tree,
    fileName: string
): void {
    const astTestRunDir = getTestRunDir("astTests");
    const analysisFilePath = join(
        astTestRunDir,
        `${fileName}_ast_analysis.txt`
    );

    let analysisContent = `AST Analysis for ${fileName}\n`;
    analysisContent += `${"=".repeat(50)}\n\n`;

    const beforeRoot = beforeAst.rootNode;
    const afterRoot = afterAst.rootNode;

    analysisContent += `Before AST - Type: ${beforeRoot.type}, Children: ${beforeRoot.childCount}, Named Children: ${beforeRoot.namedChildCount}\n`;
    analysisContent += `After AST  - Type: ${afterRoot.type}, Children: ${afterRoot.childCount}, Named Children: ${afterRoot.namedChildCount}\n\n`;

    analysisContent += "Differences found:\n";
    analysisContent += "-".repeat(30) + "\n";

    const differences = findAllDifferences(beforeRoot, afterRoot, "");

    if (differences.length === 0) {
        analysisContent +=
            "No differences found (this shouldn't happen if the test failed)\n";
    } else {
        let index = 0;
        for (const diff of differences) {
            analysisContent += `${index + 1}. ${diff}\n`;
            index++;
        }
    }

    analysisContent += `\n${"=".repeat(50)}\n`;
    analysisContent += `Total differences found: ${differences.length}\n`;

    fs.writeFileSync(analysisFilePath, analysisContent, "utf8");
}

function findAllDifferences(
    node1: SyntaxNode,
    node2: SyntaxNode,
    path: string
): string[] {
    const differences: string[] = [];
    const currentPath = path ? `${path} > ${node1.type}` : node1.type;

    if (node1.type !== node2.type) {
        differences.push(
            `Path: ${currentPath} - Node type mismatch: "${node1.type}" vs "${node2.type}"\n
            at position ${node1.startPosition.row}:${node1.startPosition.column}\n`
        );
        return differences;
    }

    if (node1.childCount !== node2.childCount) {
        differences.push(
            `Path: ${currentPath} - Child count mismatch: ${node1.childCount} vs ${node2.childCount}\n
            at position ${node1.startPosition.row}:${node1.startPosition.column}\n`
        );
        return differences;
    }

    if (node1.childCount === 0) {
        const text1 = node1.text.replaceAll(/\s+/g, " ").trim().toLowerCase();
        const text2 = node2.text.replaceAll(/\s+/g, " ").trim().toLowerCase();
        if (text1 !== text2) {
            differences.push(
                `Path: ${currentPath} - Terminal text mismatch: "${text1}" vs "${text2}"\n
                at position ${node1.startPosition.row}:${node1.startPosition.column}
                node1 text:\n
                "${node1.text}"\n
                node2 text:\n
                "${node2.text}"\n`
            );
        }
        return differences;
    }

    for (let i = 0; i < node1.childCount; i++) {
        const childDifferences = findAllDifferences(
            node1.child(i)!,
            node2.child(i)!,
            currentPath
        );
        differences.push(...childDifferences);
    }

    return differences;
}
