import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { join } from "path";
import Parser, { SyntaxNode, Tree } from "web-tree-sitter";
import { AblParserHelper } from "../parser/AblParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { ConfigurationManager } from "./ConfigurationManager";
import { EOL } from "../model/EOL";
import { DebugManagerMock } from "../stability-test/suite/DebugManagerMock";

// Shared constants
export const extensionDevelopmentPath = path.resolve(__dirname, "../../");
export const testResultsDir = join(
    extensionDevelopmentPath,
    "resources/testResults/stabilityTests"
);

export const stabilityTestDir = join(extensionDevelopmentPath, "resources/ade");
export const extensionsToFind = [".p", ".w", ".cls", ".i"];
export const stabilityTestCases = getFilesWithExtensions(
    stabilityTestDir,
    extensionsToFind
);

export function runGenericTest<TResult>(
    name: string,
    parserHelper: AblParserHelper,
    config: TestConfig<TResult>
): void {
    ConfigurationManager.getInstance();
    // Note: enableFormatterDecorators should be called in the specific test function

    const beforeText = settingsOverride + getInput(name);
    const beforeResult = config.processBeforeText(beforeText);
    const afterText = format(beforeText, name, parserHelper);
    const afterResult = config.processAfterText(afterText, parserHelper);

    // Handle undefined results
    if (beforeResult === undefined || afterResult === undefined) {
        return;
    }

    const nameWithRelativePath = name.startsWith(stabilityTestDir)
        ? name.slice(stabilityTestDir.length + 1)
        : name;

    const fileName = nameWithRelativePath.replace(/[\s\/\\:*?"<>|]+/g, "_");
    const knownFailures = getKnownFailures(config.knownFailuresFile);

    const hasMismatch = config.compareResults(
        beforeResult,
        afterResult,
        parserHelper
    );

    if (hasMismatch) {
        if (knownFailures.includes(fileName)) {
            console.log("Known issue");
            return;
        }

        // Call custom mismatch handler if provided
        config.onMismatch?.(beforeResult, afterResult, fileName);

        addFailedTestCase(testRunDir, config.resultFailuresFile, fileName);

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

        const testTypeLabel =
            config.testType === "symbol" ? "Symbol count" : "AST structure";
        assert.fail(`${testTypeLabel} mismatch
        Before: ${beforeFilePath}
        After: ${afterFilePath}
        `);
    }

    // if test passes but file is in error list
    if (knownFailures.includes(fileName)) {
        addFailedTestCase(testRunDir, "_new_passes.txt", fileName);
        config.cleanup?.(beforeResult, afterResult);
        assert.fail(`File should fail ${fileName}`);
    }

    config.cleanup?.(beforeResult, afterResult);
}

export const testRunTimestamp = new Date()
    .toISOString()
    .replace(/[:.T-]/g, "_")
    .substring(0, 19);
export const testRunDir = join(testResultsDir, testRunTimestamp);

// Function to get known failures for a specific test type
export function getKnownFailures(fileName: string): string[] {
    return getFailedTestCases(
        join(extensionDevelopmentPath, "resources/stabilityTests"),
        fileName
    );
}

// Function to log known failures count once at suite setup
export function logKnownFailures(
    testType: string,
    knownFailuresFile: string
): void {
    const knownFailures = getKnownFailures(knownFailuresFile);
    console.log(
        `${testType} Test Suite: ${knownFailures.length} known failures loaded`
    );
}

export const settingsOverride =
    "/* formatterSettingsOverride */\n/*" +
    readFile(
        join(
            extensionDevelopmentPath,
            "resources/stabilityTests/.vscode/settings.json"
        )
    ) +
    "*/\n";

// Shared setup function
export async function setupParserHelper(): Promise<AblParserHelper> {
    await Parser.init();
    const parserHelper = new AblParserHelper(
        extensionDevelopmentPath,
        new DebugManagerMock()
    );
    await parserHelper.awaitLanguage();
    return parserHelper;
}

// Utility functions
export function getInput(fileName: string): string {
    return readFile(fileName);
}

export function format(
    text: string,
    name: string,
    parserHelper: AblParserHelper
): string {
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

export function readFile(fileUri: string): string {
    return fs.readFileSync(fileUri, "utf-8");
}

export function getDirs(fileUri: string): string[] {
    return fs.readdirSync(fileUri, "utf-8");
}

export function getFilesWithExtensions(
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

export function getFileEOL(fileText: string): string {
    if (fileText.includes("\r\n")) {
        return "\r\n"; // Windows EOL
    } else if (fileText.includes("\n")) {
        return "\n"; // Unix/Linux/Mac EO
    } else {
        return ""; // No EOL found
    }
}

export function getFailedTestCases(filePath: string, file: string): string[] {
    const failedFilePath = path.join(filePath, file);

    // Check if the file exists to avoid errors
    if (!fs.existsSync(failedFilePath)) {
        console.log("Known Failures file does not exist!");
        return [];
    }

    // Read the file and split lines into an array
    const data = fs.readFileSync(failedFilePath, "utf8");
    const failures = data.split("\n").filter((line) => line.trim() !== "");

    return failures;
}

export function addFailedTestCase(
    filePath: string,
    fileName: string,
    failedCase: string
): void {
    const failedFilePath = path.join(filePath, fileName);

    // Append the failed test case to the file with a newline
    fs.appendFileSync(failedFilePath, failedCase + "\n", "utf8");
}

// Generic test abstraction
export interface TestConfig<TResult> {
    testType: "symbol" | "ast";
    knownFailuresFile: string;
    resultFailuresFile: string;
    processBeforeText: (text: string) => TResult;
    processAfterText: (text: string, parserHelper: AblParserHelper) => TResult;
    compareResults: (
        before: TResult,
        after: TResult,
        parserHelper?: AblParserHelper
    ) => boolean;
    onMismatch?: (before: TResult, after: TResult, fileName: string) => void;
    cleanup?: (before: TResult, after: TResult) => void;
}
