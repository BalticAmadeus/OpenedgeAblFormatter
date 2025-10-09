import * as vscode from "vscode";
import Parser from "web-tree-sitter";
import { AblFormatterProvider } from "./providers/AblFormatterProvider";
import { Constants } from "./model/Constants";
import { AblParserHelper } from "./parser/AblParserHelper";
import { AblDebugHoverProvider } from "./providers/AblDebugHoverProvider";
import { ConfigurationManager } from "./utils/ConfigurationManager";
import { enableFormatterDecorators } from "./formatterFramework/enableFormatterDecorators";
import { DebugManager } from "./providers/DebugManager";
import { Telemetry } from "./utils/Telemetry";

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

    // Wait for both language and worker initialization
    try {
        await parserHelper.awaitLanguage();
        console.log("[Extension] Language initialization completed");

        await parserHelper.awaitWorker();
        console.log("[Extension] Worker initialization completed");
    } catch (error) {
        console.warn(
            "[Extension] Worker initialization failed, some features may be limited:",
            error
        );
    }

    const formatter = new AblFormatterProvider(parserHelper);

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

// This method is called when your extension is deactivated
export function deactivate() {
    //do nothing
}
