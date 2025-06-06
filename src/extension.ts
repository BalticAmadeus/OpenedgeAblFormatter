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
}

// This method is called when your extension is deactivated
export function deactivate() {
    //do nothing
}
