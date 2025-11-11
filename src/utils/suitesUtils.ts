import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { join } from "path";
import Parser from "web-tree-sitter";
import { AblParserHelper } from "../parser/AblParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { ConfigurationManager } from "./ConfigurationManager";
import { DebugManagerMock } from "../test-ast/suite/DebugManagerMock";
import { MetamorphicEngine } from "../mtest/MetamorphicEngine";
import { TestConfig } from "./iTestConfig";

// Shared constants
export const extensionDevelopmentPath = path.resolve(__dirname, "../../");

export function getTestResultsDir(endpoint: string): string {
    return join(extensionDevelopmentPath, `resources/testResults/${endpoint}`);
}

export const stabilityTestDir = join(extensionDevelopmentPath, "resources/ade");
export const extensionsToFind = [".p", ".w", ".cls", ".i"];
export const stabilityTestCases = getFilesWithExtensions(
    stabilityTestDir,
    extensionsToFind
);

export async function runGenericTest<
    TResult extends { tree: any; text: string }
>(
    name: string,
    parserHelper: AblParserHelper,
    config: TestConfig<TResult>,
    metamorphicEngine?: MetamorphicEngine<any>
): Promise<void> {
    ConfigurationManager.getInstance();

    const beforeText = settingsOverride + getInput(name);
    const beforeResult = await config.processBeforeText(
        beforeText,
        parserHelper
    );

    // Await the async format function
    const afterText = await format(beforeText, name, parserHelper);
    const afterResult = await config.processAfterText(afterText, parserHelper);

    if (beforeResult === undefined || afterResult === undefined) {
        return;
    }

    const nameWithRelativePath = name.startsWith(stabilityTestDir)
        ? name.slice(stabilityTestDir.length + 1)
        : name;

    const fileName = nameWithRelativePath.replace(/[\s\/\\:*?"<>|]+/g, "_");
    const fileNameNorm = fileName.trim().toLowerCase();
    const knownFailures = getKnownFailures(config.knownFailuresFile).map((f) =>
        f.trim().toLowerCase()
    );
    const currentTestRunDir = getTestRunDir(config.testType + "Tests");

    const hasMismatch = await config.compareResults(
        beforeResult,
        afterResult,
        parserHelper
    );

    if (hasMismatch) {
        if (knownFailures.includes(fileNameNorm)) {
            console.log("Known issue");
            return;
        }

        config.onMismatch?.(beforeResult, afterResult, fileName);

        addFailedTestCase(
            currentTestRunDir,
            config.resultFailuresFile,
            fileName
        );

        const beforeFilePath = join(
            currentTestRunDir,
            `${fileName}_before${path.extname(name)}`
        );
        const afterFilePath = join(
            currentTestRunDir,
            `${fileName}_after${path.extname(name)}`
        );

        fs.mkdirSync(currentTestRunDir, { recursive: true });

        fs.writeFileSync(beforeFilePath, beforeText);
        fs.writeFileSync(afterFilePath, afterText);

        assert.fail(
            `${config.testType} mismatch\n        Before: ${beforeFilePath}\n        After: ${afterFilePath}\n        `
        );
    }

    if (knownFailures.includes(fileNameNorm)) {
        addFailedTestCase(currentTestRunDir, "_new_passes.txt", fileName);
        config.cleanup?.(beforeResult, afterResult);
        assert.fail(`File should fail ${fileName}`);
    }

    if (metamorphicEngine) {
        metamorphicEngine.addNameInputAndOutputPair(
            name,
            { eolDel: getFileEOL(beforeText) },
            beforeResult,
            afterResult
        );
    }

    config.cleanup?.(beforeResult, afterResult);
}

export const testRunTimestamp = new Date()
    .toISOString()
    .replace(/[:.T-]/g, "_")
    .substring(0, 19);

export function getTestRunDir(testType: string): string {
    const baseDir = getTestResultsDir(testType);
    return join(baseDir, testRunTimestamp);
}

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
    await parserHelper.startWorker();
    return parserHelper;
}

// Utility functions
export function getInput(fileName: string): string {
    return readFile(fileName);
}

export async function format(
    text: string,
    name: string,
    parserHelper: AblParserHelper
): Promise<string> {
    // Use the worker-based format method
    const result = await parserHelper.format(
        new FileIdentifier(name, 1),
        text,
        { eol: { eolDel: getFileEOL(text) } }
    );
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

    fs.mkdirSync(filePath, { recursive: true });

    // Append the failed test case to the file with a newline
    fs.appendFileSync(failedFilePath, failedCase + "\n", "utf8");
}
