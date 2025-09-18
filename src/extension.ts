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

    // Register 'Report a Bug' command
    const reportBugCommand = vscode.commands.registerCommand(
        "openedgeAblFormatter.reportBug",
        () => {
            vscode.env.openExternal(
                vscode.Uri.parse(
                    "https://github.com/BalticAmadeus/AblFormatter/issues/new/choose"
                )
            );
        }
    );
    context.subscriptions.push(reportBugCommand);

    // Add a status bar button for reporting bugs
    const bugStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        99
    );
    bugStatusBarItem.text = "$(bug) Report Bug";
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
