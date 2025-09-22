import * as assert from "assert";
import * as fs from "fs";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { FormattingEngine } from "../../formatterFramework/FormattingEngine";
import { ConfigurationManager } from "../../utils/ConfigurationManager";
import Parser, { SyntaxNode, Tree } from "web-tree-sitter";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import path, { join } from "path";
import { EOL } from "../../model/EOL";
import { DebugManagerMock } from "./DebugManagerMock";

let parserHelper: AblParserHelper;

const extensionDevelopmentPath = path.resolve(__dirname, "../../../");
const testResultsDir = join(
    extensionDevelopmentPath,
    "resources/testResults/stabilityTests"
);

const stabilityTestDir = join(extensionDevelopmentPath, "resources/ade");
const extensionsToFind = [".p", ".w", ".cls", ".i"];
const stabilityTestCases = getFilesWithExtensions(
    stabilityTestDir,
    extensionsToFind
);

const testRunTimestamp = new Date()
    .toISOString()
    .replace(/[:.T-]/g, "_")
    .substring(0, 19);
const testRunDir = join(testResultsDir, testRunTimestamp);

const knownFailures = getFailedTestCases(
    join(extensionDevelopmentPath, "resources/stabilityTests"),
    "_failures.txt"
);

const knownAstFailures = getFailedTestCases(
    join(extensionDevelopmentPath, "resources/stabilityTests"),
    "_astfailures.txt"
);

const settingsOverride =
    "/* formatterSettingsOverride */\n/*" +
    readFile(
        join(
            extensionDevelopmentPath,
            "resources/stabilityTests/.vscode/settings.json"
        )
    ) +
    "*/\n";

console.log(settingsOverride);

suite("Stability Test Suite", () => {
    console.log("Parser initialized");

    suiteTeardown(() => {
        vscode.window.showInformationMessage("All tests done!");
    });

    suiteSetup(async () => {
        await Parser.init().then(() => {
            console.log("Suite setup");
        });

        fs.mkdirSync(testRunDir, { recursive: true });

        parserHelper = new AblParserHelper(
            extensionDevelopmentPath,
            new DebugManagerMock()
        );
        await parserHelper.awaitLanguage();

        console.log(
            "StabilityTests: ",
            extensionDevelopmentPath,
            stabilityTestCases.toString()
        );
    });

    let fileId = 0;

    stabilityTestCases.forEach((cases) => {
        test(`Symbol test: ${cases}`, () => {
            symbolTest(cases);
        }).timeout(10000);
    });

    stabilityTestCases.forEach((cases) => {
        test(`AST test: ${cases}`, () => {
            astTest(cases);
        }).timeout(10000);
    });
});

function symbolTest(name: string): void {
    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    const beforeText = settingsOverride + getInput(name);
    const beforeCount = countActualSymbols(beforeText);
    const afterText = format(beforeText, name);
    const afterCount = countActualSymbols(afterText);

    const nameWithRelativePath = name.startsWith(stabilityTestDir)
        ? name.slice(stabilityTestDir.length + 1)
        : name;

    const fileName = nameWithRelativePath.replace(/[\s\/\\:*?"<>|]+/g, "_");

    if (beforeCount !== afterCount) {
        if (knownFailures.includes(fileName)) {
            console.log("Known issue");
            return;
        }

        addFailedTestCase(testRunDir, "_failures.txt", fileName);

        const beforeFilePath = join(
            testRunDir,
            `${fileName}_before${path.extname(name)}`
        );
        const afterFilePath = join(
            testRunDir,
            `${fileName}_after${path.extname(name)}`
        );

        fs.writeFileSync(beforeFilePath, beforeText);
        fs.writeFileSync(afterFilePath, afterText);

        assert.fail(`Symbol count mismatch
        Before: ${beforeFilePath}
        After: ${afterFilePath}
        `);
    }

    // if test passes but file is in error list
    if (knownFailures.includes(fileName)) {
        addFailedTestCase(testRunDir, "_new_passes.txt", fileName);

        assert.fail(`File should fail ${fileName}`);
    }
}

function astTest(name: string): void {
    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    const beforeText = settingsOverride + getInput(name);
    const beforeAst = generateAst(beforeText);
    const afterText = format(beforeText, name);
    const afterAst = generateAst(afterText);

    if (beforeAst === undefined || afterAst === undefined) {
        return;
    }

    const nameWithRelativePath = name.startsWith(stabilityTestDir)
        ? name.slice(stabilityTestDir.length + 1)
        : name;

    const fileName = nameWithRelativePath.replace(/[\s\/\\:*?"<>|]+/g, "_");

    if (compareAst(beforeAst, afterAst)) {
        if (knownAstFailures.includes(fileName)) {
            console.log("Known issue");
            return;
        }

        analyzeAstDifferences(beforeAst, afterAst, fileName);

        addFailedTestCase(testRunDir, "_failures.txt", fileName);

        const beforeFilePath = join(
            testRunDir,
            `${fileName}_before${path.extname(name)}`
        );
        const afterFilePath = join(
            testRunDir,
            `${fileName}_after${path.extname(name)}`
        );

        fs.writeFileSync(beforeFilePath, beforeText);
        fs.writeFileSync(afterFilePath, afterText);

        assert.fail(`AST structure mismatch
        Before: ${beforeFilePath}
        After: ${afterFilePath}
        `);
    }

    // if test passes but file is in error list
    if (knownAstFailures.includes(fileName)) {
        addFailedTestCase(testRunDir, "_new_passes.txt", fileName);

        assert.fail(`File should fail ${fileName}`);
    }
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

function getInput(fileName: string): string {
    return readFile(fileName);
}

function format(text: string, name: string): string {
    const configurationManager = ConfigurationManager.getInstance();

    const codeFormatter = new FormattingEngine(
        parserHelper,
        new FileIdentifier(name, 1),
        configurationManager,
        new DebugManagerMock()
    );

    const result = codeFormatter.formatText(text, new EOL(getFileEOL(text)));

    return result;
}

function readFile(fileUri: string): string {
    return fs.readFileSync(fileUri, "utf-8");
}

function getDirs(fileUri: string): string[] {
    return fs.readdirSync(fileUri, "utf-8");
}

function getFilesWithExtensions(
    rootDir: string,
    extensions: string[]
): string[] {
    let results: string[] = [];

    const items = getDirs(rootDir); // Get all items in the directory

    for (const item of items) {
        const fullPath = path.join(rootDir, item); // Get full path to the item
        const stat = fs.statSync(fullPath); // Get info about the item (file or directory)

        if (stat.isDirectory()) {
            // If it's a directory, recursively scan it
            results = results.concat(
                getFilesWithExtensions(fullPath, extensions)
            );
        } else {
            // If it's a file, check if its extension matches
            const ext = path.extname(item).toLowerCase();
            if (extensions.includes(ext)) {
                results.push(fullPath);
            }
        }
    }

    return results;
}

function getFileEOL(fileText: string): string {
    if (fileText.includes("\r\n")) {
        return "\r\n"; // Windows EOL
    } else if (fileText.includes("\n")) {
        return "\n"; // Unix/Linux/Mac EO
    } else {
        return ""; // No EOL found
    }
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

function parseAndCheckForErrors(
    text: string,
    name: string
): Parser.SyntaxNode[] {
    const parseResult = parserHelper.parse(new FileIdentifier(name, 1), text);

    const rootNode = parseResult.tree.rootNode;
    const errors = getNodesWithErrors(rootNode);

    return errors;
}

function treeSitterTest(text: string, name: string): void {
    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    const errors = parseAndCheckForErrors(text, name);

    const errorMessage = formatErrorMessage(errors, name);

    assert.strictEqual(errors.length, 0, errorMessage);
}

function getNodesWithErrors(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    let errorNodes: Parser.SyntaxNode[] = [];

    if (node.hasError()) {
        errorNodes.push(node);
    }

    node.children.forEach((child) => {
        errorNodes = errorNodes.concat(getNodesWithErrors(child));
    });

    return errorNodes;
}

function formatErrorMessage(errors: Parser.SyntaxNode[], name: string): string {
    if (errors.length === 0) {
        return "";
    }

    let errorMessage = `\n\nAssertionError [ERR_ASSERTION]: Expected no errors, but found ${errors.length} in ${name}.\n`;
    errorMessage += `--------------------------------------------------------------------------------\n`;

    errors.forEach((errorNode, index) => {
        errorMessage += `Error ${index + 1}:\n`;
        errorMessage += `- Type           : ${errorNode.type}\n`;
        errorMessage += `- Start Position : Line ${
            errorNode.startPosition.row + 1
        }, Column ${errorNode.startPosition.column + 1}\n`;
        errorMessage += `- End Position   : Line ${
            errorNode.endPosition.row + 1
        }, Column ${errorNode.endPosition.column + 1}\n`;
        errorMessage += `- Code Snippet   :\n\n${errorNode.text}\n`;
        errorMessage += `--------------------------------------------------------------------------------\n`;
    });

    return errorMessage;
}

function getFailedTestCases(filePath: string, file: string): string[] {
    const failedFilePath = path.join(filePath, file);

    // Check if the file exists to avoid errors
    if (!fs.existsSync(failedFilePath)) {
        console.log("Known Failures file does not exist!");
        return [];
    }

    // Read the file and split lines into an array
    const data = fs.readFileSync(failedFilePath, "utf8");
    const failures = data.split("\n").filter((line) => line.trim() !== "");

    console.log("Known failures list has ", failures.length, "cases");

    return failures;
}

function addFailedTestCase(
    filePath: string,
    fileName: string,
    failedCase: string
): void {
    const failedFilePath = path.join(filePath, fileName);

    // Append the failed test case to the file with a newline
    fs.appendFileSync(failedFilePath, failedCase + "\n", "utf8");
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
            ``;
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
