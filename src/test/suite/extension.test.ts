import * as assert from "node:assert";
import * as fs from "node:fs";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { ConfigurationManager } from "../../utils/ConfigurationManager";
import Parser from "web-tree-sitter";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import path, { join } from "node:path";
import { EOL } from "../../model/EOL";
import { setupParserHelper } from "../../utils/suitesUtils";
import { MetamorphicEngine } from "../../mtest/MetamorphicEngine";
import { ReplaceEQ } from "../../mtest/mrs/ReplaceEQ";
import { ReplaceForEachToForLast } from "../../mtest/mrs/ReplaceForEachToForLast";
import { RemoveNoError } from "../../mtest/mrs/RemoveNoError";
import { DebugTestingEngineOutput } from "../../mtest/EngineParams";
import { FormattingEngineMock } from "../../formatterFramework/FormattingEngineMock";
import { IdempotenceMR } from "../../mtest/mrs/Idempotence";

let parserHelper: AblParserHelper;

const extensionDevelopmentPath = path.resolve(__dirname, "../../../");
const functionalTestDir = "resources/functionalTests";
const testResultsDir = path.join(
    extensionDevelopmentPath,
    "resources/testResults/functionalTests"
);
const functionalTestDirs = getDirs(
    path.join(extensionDevelopmentPath, functionalTestDir)
);
let functionalTestCases: string[] = [];
functionalTestDirs.forEach((dir) => {
    const dirPath = path.join(extensionDevelopmentPath, functionalTestDir, dir);
    // Only process if it's a directory
    if (!fs.statSync(dirPath).isDirectory()) {
        return;
    }
    const testsInsideDir = getDirs(dirPath);
    testsInsideDir.forEach((test) => {
        functionalTestCases.push(dir + "/" + test);
    });
});

const knownFailures = getFailedTestCases(
    join(extensionDevelopmentPath, "resources/functionalTests")
);
const treeSitterErrorTestDir = "resources/treeSitterErrorTests";
const treeSitterErrorTestDirs = getDirs(
    path.join(extensionDevelopmentPath, treeSitterErrorTestDir)
);
let treeSitterTestCases: string[] = [];

const isMetamorphicEnabled =
    process.argv.includes("--metamorphic") ||
    process.env.TEST_MODE === "metamorphic";

console.log("Is Metamorphic Enabled:", isMetamorphicEnabled);

const metamorphicEngine = isMetamorphicEnabled
    ? new MetamorphicEngine<DebugTestingEngineOutput>(console)
          .addMR(new ReplaceEQ())
          .addMR(new ReplaceForEachToForLast())
          .addMR(new RemoveNoError())
          .addMR(new IdempotenceMR(null as any))
    : undefined;

for (const dir of treeSitterErrorTestDirs) {
    const testsInsideDir = getDirs(
        path.join(extensionDevelopmentPath, treeSitterErrorTestDir + "/" + dir)
    );
    for (const test of testsInsideDir) {
        treeSitterTestCases.push(dir + "/" + test);
    }
}

// example for running single test case;
// testCases = ["assign/1formattingFalse"];

suite("Extension Test Suite", () => {
    suiteTeardown(() => {
        vscode.window.showInformationMessage("All tests done!");
    });

    suiteSetup(async () => {
        await Parser.init().then(() => {
            console.log("Parser initialized");
        });

        if (fs.existsSync(testResultsDir)) {
            fs.rmSync(testResultsDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testResultsDir, { recursive: true });

        parserHelper = await setupParserHelper();

        // Set parser helper for IdempotenceMR
        if (metamorphicEngine) {
            const idempotenceMR = metamorphicEngine.getMR(
                "Idempotence"
            ) as IdempotenceMR;
            idempotenceMR.setParserHelper(parserHelper);
        }

        await parserHelper.startWorker();

        if (metamorphicEngine) {
            metamorphicEngine.setFormattingEngine(
                new FormattingEngineMock(parserHelper)
            );
        }

        console.log(
            "FunctionalTests: ",
            extensionDevelopmentPath,
            functionalTestCases.toString()
        );
        console.log(
            "TreeSitterTests: ",
            extensionDevelopmentPath,
            treeSitterTestCases.toString()
        );
    });

    for (const cases of functionalTestCases) {
        test(`Functional test: ${cases}`, async () => {
            await functionalTest(cases);
        }).timeout(10000);
    }

    for (const cases of treeSitterTestCases) {
        test(`Tree Sitter Error test: ${cases}`, async () => {
            await treeSitterTest(cases);
        }).timeout(10000);
    }

    suiteTeardown(() => {
        if (metamorphicEngine === undefined) {
            return;
        }

        const metamorphicTestCases = metamorphicEngine.getMatrix();
        console.log(
            "Running Metamorphic Tests:",
            metamorphicTestCases
                .map((item) => `${item.fileName}:${item.mrName}`)
                .join(",")
        );

        suite("Metamorphic Tests", () => {
            metamorphicTestCases.forEach((cases) => {
                test(`Metamorphic test: ${cases.fileName} ${cases.mrName}`, async () => {
                    const result = await metamorphicEngine.runOne(
                        cases.fileName,
                        cases.mrName
                    );

                    assert.equal(
                        result,
                        undefined,
                        result?.actual + "\r\n" + result?.expected
                    );
                }).timeout(10000);
            });
        });
    });
});

async function functionalTest(name: string): Promise<void> {
    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    const inputText = getInput(name);

    const resultText = await parserHelper.format(
        new FileIdentifier(name, 1),
        inputText,
        { eol: new EOL(getFileEOL(inputText)) }
    );

    const inputTree = await parserHelper.parseAsync(
        new FileIdentifier(name, 1),
        inputText
    );

    const resultTree = await parserHelper.parseAsync(
        new FileIdentifier(name, 1),
        resultText
    );

    if (metamorphicEngine) {
        metamorphicEngine.addNameInputAndOutputPair(
            name,
            new EOL(getFileEOL(inputText)),
            { text: inputText, tree: inputTree.tree },
            { text: resultText, tree: resultTree.tree }
        );
    }

    const targetText = getTarget(name);
    const fileName = name.replaceAll(/[\s/\\:*?"<>|]+/g, "_");

    try {
        if (knownFailures.includes(fileName)) {
            assert.notStrictEqual(
                resultText
                    .replaceAll(" ", "_")
                    .replaceAll("\r\n", "#CRLF\r\n")
                    .replaceAll(/(?<!\r)\n/g, "#LF\n"),
                targetText
                    .replaceAll(" ", "_")
                    .replaceAll("\r\n", "#CRLF\r\n")
                    .replaceAll(/(?<!\r)\n/g, "#LF\n")
            );
        } else {
            assert.strictEqual(
                resultText
                    .replaceAll(" ", "_")
                    .replaceAll("\r\n", "#CRLF\r\n")
                    .replaceAll(/(?<!\r)\n/g, "#LF\n"),
                targetText
                    .replaceAll(" ", "_")
                    .replaceAll("\r\n", "#CRLF\r\n")
                    .replaceAll(/(?<!\r)\n/g, "#LF\n")
            );
        }
    } catch (err: any) {
        if (knownFailures.includes(fileName)) {
            console.log(
                "Issue was fixed - please remove from known failures list: ",
                fileName
            );
        }

        const afterFilePath = path.join(testResultsDir, `${fileName}.p`);

        fs.writeFileSync(afterFilePath, resultText, "utf-8");

        err.stack = `${err.stack}\n\n Failing output written to: ${afterFilePath}\n`;

        throw err;
    }
}

function getError(fileName: string): string {
    const filePath = path.join(
        extensionDevelopmentPath,
        treeSitterErrorTestDir,
        fileName,
        "error.p"
    );
    return readFile(filePath);
}

function getInput(fileName: string): string {
    const filePath = path.join(
        extensionDevelopmentPath,
        functionalTestDir,
        fileName,
        "input.p"
    );
    return readFile(filePath);
}

function getTarget(fileName: string): string {
    const filePath = path.join(
        extensionDevelopmentPath,
        functionalTestDir,
        fileName,
        "target.p"
    );

    return readFile(filePath);
}

function readFile(fileUri: string): string {
    return fs.readFileSync(fileUri, "utf-8");
}

function getDirs(fileUri: string): string[] {
    try {
        return fs.readdirSync(fileUri, { encoding: "utf-8" });
    } catch (error) {
        console.error(`Failed to read directory: ${fileUri}`, error);
        return [];
    }
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

async function treeSitterTest(name: string): Promise<void> {
    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    const errorText = getError(name);
    const errors = await parseAndCheckForErrors(errorText, name);

    const errorMessage = formatErrorMessage(errors, name);

    assert.strictEqual(errors.length, 0, errorMessage);
}

async function parseAndCheckForErrors(
    text: string,
    name: string
): Promise<Parser.SyntaxNode[]> {
    const parseResult = await parserHelper.parseAsync(
        new FileIdentifier(name, 1),
        text
    );

    const rootNode = parseResult.tree.rootNode;
    const errors = getNodesWithErrors(rootNode);

    return errors;
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
    const failures = data
        .split("\n")
        .map((line) => line.replace(/\r$/, "")) // Remove trailing \r if present
        .filter((line) => line.trim() !== ""); // Filter out empty lines

    console.log("Known failures list has ", failures.length, "cases");

    return failures;
}
