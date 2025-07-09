import * as assert from "assert";
import * as fs from "fs";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { FormattingEngine } from "../../formatterFramework/FormattingEngine";
import { ConfigurationManager } from "../../utils/ConfigurationManager";
import Parser from "web-tree-sitter";
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

    stabilityTestCases.forEach((cases) => {
        test(`Symbol test: ${cases}`, () => {
            stabilityTest(cases);
        }).timeout(10000);
    });
});

function stabilityTest(name: string): void {
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
