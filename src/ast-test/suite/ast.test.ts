import * as fs from "fs";
import * as vscode from "vscode";
import { join } from "path";
import { Tree, SyntaxNode } from "web-tree-sitter";
import { ConfigurationManager } from "../../utils/ConfigurationManager";
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
import { FileIdentifier } from "../../model/FileIdentifier";
import { FormattingEngine } from "../../formatterFramework/FormattingEngine";
import { DebugManagerMock } from "./DebugManagerMock";

let parserHelper: AblParserHelper;

suite("AST Stability Test Suite", () => {
    suiteSetup(async () => {
        console.log("AST Test Suite setup");
        fs.mkdirSync(testRunDir, { recursive: true });
        parserHelper = await setupParserHelper();
        console.log(
            "AST StabilityTests: ",
            stabilityTestCases.length,
            "test cases"
        );

        // Log known failures count once at suite setup
        logKnownFailures("AST", "_ast_failures.txt");
    });

    suiteTeardown(() => {
        if (parserHelper) {
            // Clean up parser resources if needed
            parserHelper = null as any;
        }
        vscode.window.showInformationMessage("AST tests done!");
    });

    stabilityTestCases.forEach((cases) => {
        test(`AST test: ${cases}`, () => {
            astTest(cases, parserHelper);
        }).timeout(10000);
    });
});

function astTest(name: string, parserHelper: AblParserHelper): void {
    enableFormatterDecorators();

    const config: TestConfig<Tree | undefined> = {
        testType: "ast",
        knownFailuresFile: "_ast_failures.txt",
        resultFailuresFile: "_ast_failures.txt",
        processBeforeText: (text: string) => generateAst(text),
        processAfterText: (text: string) => generateAst(text),
        compareResults: (
            before: Tree | undefined,
            after: Tree | undefined,
            parserHelper?: AblParserHelper
        ) => {
            if (!before || !after || !parserHelper) return false;
            return compareAst(before, after);
        },
        onMismatch: (
            before: Tree | undefined,
            after: Tree | undefined,
            fileName: string
        ) => {
            if (before && after) {
                analyzeAstDifferences(before, after, fileName);
            }
        },
        cleanup: (before: Tree | undefined, after: Tree | undefined) => {
            before?.delete();
            after?.delete();
        },
    };

    runGenericTest(name, parserHelper, config);
}

function generateAst(text: string): Tree | undefined {
    const tree = parserHelper.parse(new FileIdentifier("test", 1), text).tree;
    return tree;
}

function compareAst(ast1: Tree, ast2: Tree): boolean {
    const configurationManager = ConfigurationManager.getInstance();
    const formattingEngine = new FormattingEngine(
        parserHelper,
        new FileIdentifier("comparison", 1),
        configurationManager,
        new DebugManagerMock()
    );

    return !formattingEngine.isAstEqual(ast1, ast2);
}

function analyzeAstDifferences(
    beforeAst: Tree,
    afterAst: Tree,
    fileName: string
): void {
    const analysisFilePath = join(testRunDir, `${fileName}_ast_analysis.txt`);

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
        differences.forEach((diff: string, index: number) => {
            analysisContent += `${index + 1}. ${diff}\n`;
        });
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
        const text1 = node1.text.replace(/\s+/g, " ").trim().toLowerCase();
        const text2 = node2.text.replace(/\s+/g, " ").trim().toLowerCase();
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
