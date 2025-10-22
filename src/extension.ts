import * as vscode from "vscode";
import Parser from "web-tree-sitter";
import { AblFormatterProvider } from "./providers/AblFormatterProvider";
import { Constants } from "./model/Constants";
import { AblParserHelper } from "./parser/AblParserHelper";
import { AblDebugHoverProvider } from "./providers/AblDebugHoverProvider";
import { ConfigurationManager } from "./utils/ConfigurationManager";
import { enableFormatterDecorators } from "./formatterFramework/enableFormatterDecorators";
import { DebugManager } from "./providers/DebugManager";
import { MetamorphicEngine } from "./mtest/MetamorphicEngine";
import { Telemetry } from "./utils/Telemetry";
import { ReplaceEQ } from "./mtest/mrs/ReplaceEQ";
import { ReplaceForEachToForLast } from "./mtest/mrs/ReplaceForEachToForLast";
import { RemoveNoError } from "./mtest/mrs/RemoveNoError";
import { BaseEngineOutput } from "./mtest/EngineParams";

const metamorphicTestingEngine = new MetamorphicEngine<BaseEngineOutput>(
    undefined //no excessive logging
);

export async function activate(context: vscode.ExtensionContext) {
    const debugManager = DebugManager.getInstance(context);

    await Parser.init().then(() => {});

    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    context.subscriptions.push(Telemetry.getInstance());

    const parserHelper = new AblParserHelper(
        context.extensionPath,
        debugManager
    );

    const metamorphicRelationsList = [
        new ReplaceEQ(),
        new ReplaceForEachToForLast(),
        new RemoveNoError(),
    ];
    metamorphicTestingEngine.addMRs(metamorphicRelationsList);

    debugManager.setParserHelper(parserHelper);
    // Start the parser worker ONCE when the extension is enabled
    await parserHelper.startWorker();

    const formatter = new AblFormatterProvider(
        parserHelper,
        metamorphicTestingEngine
    );

    vscode.languages.registerDocumentRangeFormattingEditProvider(
        Constants.ablId,
        formatter
    );

    vscode.languages.registerDocumentFormattingEditProvider(
        Constants.ablId,
        formatter
    );

    const hoverProvider = new AblDebugHoverProvider(parserHelper);
    vscode.languages.registerHoverProvider(Constants.ablId, hoverProvider);
    Telemetry.sendExtensionSettings();

    const excludeCodeCommand = vscode.commands.registerCommand(
        "openedgeAblFormatter.excludeCode",
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const selection = editor.selection;

            if (selection.isEmpty) {
                vscode.window.showInformationMessage(
                    "Please select a block of code to exclude."
                );
                return;
            }

            const selectedText = editor.document.getText(selection);

            const newText =
                `@AblFormatterExcludeStart.\n` +
                selectedText +
                `\n@AblFormatterExcludeEnd.`;

            await editor.edit((editBuilder) => {
                editBuilder.replace(selection, newText);
            });
        }
    );

    context.subscriptions.push(excludeCodeCommand);

    setInterval(runPeriodicTask, 20_000);

    const reportBugCommand = vscode.commands.registerCommand(
        "openedgeAblFormatter.reportBug",
        () => {
            vscode.env.openExternal(
                vscode.Uri.parse(
                    "https://github.com/BalticAmadeus/AblFormatter/issues/new"
                )
            );
        }
    );
    context.subscriptions.push(reportBugCommand);

    const bugStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        99
    );

    bugStatusBarItem.text = "$(bug) ABL Formatter: Report Bug";
    bugStatusBarItem.command = "openedgeAblFormatter.reportBug";
    bugStatusBarItem.tooltip =
        "Report a bug or issue for OpenEdge ABL Formatter";
    bugStatusBarItem.show();
    context.subscriptions.push(bugStatusBarItem);
}

function runPeriodicTask() {
    const resultList = metamorphicTestingEngine.runAll();
    let numOfFails = 0;

    resultList.forEach((result) => {
        if (result !== true) {
            numOfFails++;
            console.log("Fail", (result as BaseEngineOutput).mrName);
        }
    });

    if (resultList.length > 0) {
        console.log(
            "Num of test cases",
            resultList.length,
            ". Pass rate %",
            ((resultList.length - numOfFails) / resultList.length) * 100
        );
    } else {
        console.log("Nothing to test");
    }
}

// This method is called when your extension is deactivated
export function deactivate() {
    //do nothing
}
