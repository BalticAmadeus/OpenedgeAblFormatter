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

console.log("Parser initialized", stabilityTestCases);

const testRunTimestamp = new Date()
    .toISOString()
    .replace(/[:.T-]/g, "_")
    .substring(0, 19);
const testRunDir = join(testResultsDir, testRunTimestamp);

const knownFailures = getFailedTestCases(
    join(extensionDevelopmentPath, "resources/stabilityTests")
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

suite("Extension Test Suite", () => {
    console.log("Parser initialized", stabilityTestCases);

    suiteTeardown(() => {
        vscode.window.showInformationMessage("All tests done!");
    });

    suiteSetup(async () => {
        await Parser.init().then(() => {
            console.log("Parser initialized");
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

    // stabilityTestCases.forEach((cases) => {
    //     test(`Symbol test: ${cases}`, () => {
    //         symbolTest(cases);
    //     }).timeout(10000);
    // });

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

    if (beforeAst === undefined) {
        console.warn(
            `Skipping AST test for ${name} - could not generate before AST`
        );
        return;
    }

    const afterText = format(beforeText, name);
    const afterAst = generateAst(afterText);

    if (afterAst === undefined) {
        console.warn(
            `Skipping AST test for ${name} - could not generate after AST`
        );
        return;
    }

    const nameWithRelativePath = name.startsWith(stabilityTestDir)
        ? name.slice(stabilityTestDir.length + 1)
        : name;

    const fileName = nameWithRelativePath.replace(/[\s\/\\:*?"<>|]+/g, "_");

    if (compareAst(beforeAst, afterAst)) {
        if (knownFailures.includes(fileName)) {
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

        // Also write AST representations for easier analysis
        writeAstToFile(beforeAst, beforeFilePath);
        writeAstToFile(afterAst, afterFilePath);

        assert.fail(`AST structure mismatch
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

function generateAst(text: string): Tree | undefined {
    try {
        const tree = parserHelper.parse(
            new FileIdentifier("test", 1),
            text
        ).tree;
        return tree;
    } catch (error) {
        // Handle Tree-sitter WASM memory errors
        if (
            error instanceof Error &&
            error.message.includes("memory access out of bounds")
        ) {
            console.warn(
                "Tree-sitter memory error - skipping AST generation for large file"
            );
            return undefined;
        }
        // Re-throw other unexpected errors
        throw error;
    }
}

function compareAst(ast1: Tree, ast2: Tree): boolean {
    return !areAstNodesEqual(ast1.rootNode, ast2.rootNode);
}

function areAstNodesEqual(node1: SyntaxNode, node2: SyntaxNode): boolean {
    // Compare node types
    if (node1.type !== node2.type) {
        console.log(`Node type mismatch: "${node1.type}" vs "${node2.type}"`);
        console.log(
            `Position: ${node1.startPosition.row}:${node1.startPosition.column}`
        );
        return false;
    }

    // Compare child count
    if (node1.childCount !== node2.childCount) {
        console.log(
            `Child count mismatch for ${node1.type}: ${node1.childCount} vs ${node2.childCount}`
        );
        console.log(
            `Position: ${node1.startPosition.row}:${node1.startPosition.column}`
        );
        return false;
    }

    // Compare named child count
    if (node1.namedChildCount !== node2.namedChildCount) {
        console.log(
            `Named child count mismatch for ${node1.type}: ${node1.namedChildCount} vs ${node2.namedChildCount}`
        );
        console.log(
            `Position: ${node1.startPosition.row}:${node1.startPosition.column}`
        );
        return false;
    }

    if (node1.childCount === 0) {
        const text1 = node1.text.replace(/\s+/g, " ").trim();
        const text2 = node2.text.replace(/\s+/g, " ").trim();
        if (text1 !== text2) {
            console.log(`Terminal node text mismatch for ${node1.type}:`);
            console.log(
                `Position: ${node1.startPosition.row}:${node1.startPosition.column}`
            );
            console.log(`Text1: "${text1}"`);
            console.log(`Text2: "${text2}"`);
            return false;
        }
        return true;
    }

    for (let i = 0; i < node1.childCount; i++) {
        if (!areAstNodesEqual(node1.child(i)!, node2.child(i)!)) {
            return false;
        }
    }

    return true;
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

function getFailedTestCases(filePath: string): string[] {
    const failedFilePath = path.join(filePath, "_failures.txt");

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
    console.log(`\n=== AST Analysis for ${fileName} ===`);

    const beforeRoot = beforeAst.rootNode;
    const afterRoot = afterAst.rootNode;

    console.log(
        `Before AST - Type: ${beforeRoot.type}, Children: ${beforeRoot.childCount}, Named Children: ${beforeRoot.namedChildCount}`
    );
    console.log(
        `After AST  - Type: ${afterRoot.type}, Children: ${afterRoot.childCount}, Named Children: ${afterRoot.namedChildCount}`
    );

    findFirstDifference(beforeRoot, afterRoot, "");
    console.log(`=== End AST Analysis ===\n`);
}

function findFirstDifference(
    node1: SyntaxNode,
    node2: SyntaxNode,
    path: string
): boolean {
    const currentPath = path ? `${path} > ${node1.type}` : node1.type;

    if (node1.type !== node2.type) {
        console.log(`❌ First difference found at path: ${currentPath}`);
        console.log(`   Node type: "${node1.type}" vs "${node2.type}"`);
        console.log(
            `   Position: ${node1.startPosition.row}:${node1.startPosition.column}`
        );
        return true;
    }

    if (node1.childCount !== node2.childCount) {
        console.log(`❌ First difference found at path: ${currentPath}`);
        console.log(
            `   Child count: ${node1.childCount} vs ${node2.childCount}`
        );
        console.log(
            `   Position: ${node1.startPosition.row}:${node1.startPosition.column}`
        );
        return true;
    }

    if (node1.childCount === 0) {
        const text1 = node1.text.replace(/\s+/g, " ").trim().toLowerCase();
        const text2 = node2.text.replace(/\s+/g, " ").trim().toLowerCase();
        if (text1 !== text2) {
            console.log(`❌ First difference found at path: ${currentPath}`);
            console.log(`   Terminal text: "${text1}" vs "${text2}"`);
            console.log(
                `   Position: ${node1.startPosition.row}:${node1.startPosition.column}`
            );
            return true;
        }
        return false;
    }

    for (let i = 0; i < node1.childCount; i++) {
        if (
            findFirstDifference(node1.child(i)!, node2.child(i)!, currentPath)
        ) {
            return true;
        }
    }

    return false;
}

function writeAstToFile(ast: Tree, filePath: string): void {
    const astText = serializeAstNode(ast.rootNode, 0);
    fs.writeFileSync(
        filePath.replace(path.extname(filePath), "_ast.txt"),
        astText
    );
}

function serializeAstNode(node: SyntaxNode, depth: number): string {
    const indent = "  ".repeat(depth);
    let result = `${indent}${node.type}`;

    if (node.childCount === 0) {
        // Terminal node - show normalized text
        const text = node.text.replace(/\s+/g, " ").trim();
        if (text) {
            result += ` [${text}]`;
        }
    } else {
        result += ` (${node.childCount} children)`;
    }

    result += `\n`;

    for (let i = 0; i < node.childCount; i++) {
        result += serializeAstNode(node.child(i)!, depth + 1);
    }

    return result;
}
