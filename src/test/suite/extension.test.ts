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
import path from "path";
import { EOL } from "../../model/EOL";
import { DebugManagerMock } from "./DebugManagerMock";
import { MetamorphicEngine } from "../../mtest/MetamorphicEngine";
import { ReplaceEQ } from "../../mtest/mrs/ReplaceEQ";
import { ReplaceForEachToForLast } from "../../mtest/mrs/ReplaceForEachToForLast";
import { RemoveNoError } from "../../mtest/mrs/RemoveNoError";
import { DebugTestingEngineOutput } from "../../mtest/EngineParams";

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
    const testsInsideDir = getDirs(
        path.join(extensionDevelopmentPath, functionalTestDir + "/" + dir)
    );
    testsInsideDir.forEach((test) => {
        functionalTestCases.push(dir + "/" + test);
    });
});

const treeSitterErrorTestDir = "resources/treeSitterErrorTests";
const treeSitterErrorTestDirs = getDirs(
    path.join(extensionDevelopmentPath, treeSitterErrorTestDir)
);
let treeSitterTestCases: string[] = [];

const metamorphicEngine = new MetamorphicEngine<DebugTestingEngineOutput>()
    .addMR(new ReplaceEQ())
    .addMR(new ReplaceForEachToForLast())
    .addMR(new RemoveNoError());

treeSitterErrorTestDirs.forEach((dir) => {
    const testsInsideDir = getDirs(
        path.join(extensionDevelopmentPath, treeSitterErrorTestDir + "/" + dir)
    );
    testsInsideDir.forEach((test) => {
        treeSitterTestCases.push(dir + "/" + test);
    });
});

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

        parserHelper = new AblParserHelper(
            extensionDevelopmentPath,
            new DebugManagerMock()
        );
        await parserHelper.awaitLanguage();

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

    functionalTestCases.forEach((cases) => {
        test(`Functional test: ${cases}`, () => {
            functionalTest(cases);
        });
    });

    treeSitterTestCases.forEach((cases) => {
        test(`Tree Sitter Error test: ${cases}`, () => {
            treeSitterTest(cases);
        });
    });

    suiteTeardown(() => {
        const metamorphicTestCases = metamorphicEngine.getMatrix();
        console.log(
            "Running Metamorphic Tests:",
            metamorphicTestCases
                .map((item) => `${item.fileName}:${item.mrName}`)
                .join(",")
        );

        suite("Metamorphic Tests", () => {
            metamorphicTestCases.forEach((cases) => {
                test(`Metamorphic test: ${cases.fileName} ${cases.mrName}`, () => {
                    const result = metamorphicEngine.runOne(
                        cases.fileName,
                        cases.mrName
                    );

                    assert.equal(
                        result,
                        undefined,
                        result?.actual + "\r\n" + result?.expected
                    );
                });
            });
        });
    });
});

function functionalTest(name: string): void {
    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    const inputText = getInput(name);
    const resultText = format(inputText, name);
    const targetText = getTarget(name);

    try {
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
    } catch (err: any) {
        const fileName = name.replace(/[\s\/\\:*?"<>|]+/g, "_");

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

function format(text: string, name: string): string {
    const configurationManager = ConfigurationManager.getInstance();

    const codeFormatter = new FormattingEngine(
        parserHelper,
        new FileIdentifier(name, 1),
        configurationManager,
        new DebugManagerMock(),
        metamorphicEngine
    );

    const result = codeFormatter.formatText(
        text,
        new EOL(getFileEOL(text)),
        true
    );

    return result;
}

function readFile(fileUri: string): string {
    return fs.readFileSync(fileUri, "utf-8");
}

function getDirs(fileUri: string): string[] {
    return fs.readdirSync(fileUri, "utf-8");
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

function treeSitterTest(name: string): void {
    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    const errorText = getError(name);
    const errors = parseAndCheckForErrors(errorText as string, name);

    const errorMessage = formatErrorMessage(errors, name);

    assert.strictEqual(errors.length, 0, errorMessage);
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
