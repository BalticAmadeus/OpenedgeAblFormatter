import * as vscode from "vscode";
import Parser from "web-tree-sitter";
import { AblFormatterProvider } from "./providers/AblFormatterProvider";
import { Constants } from "./model/Constants";
import { AblParserHelper } from "./parser/AblParserHelper";
import { AblDebugHoverProvider } from "./providers/AblDebugHoverProvider";
import { ConfigurationManager2 } from "./utils/ConfigurationManager";
import { enableFormatterDecorators } from "./v2/formatterFramework/enableFormatterDecorators";
import { DebugManager } from "./providers/DebugManager";
import { GlobalSettings } from "./utils/GlobalSettings";

export async function activate(context: vscode.ExtensionContext) {
    const debugManager = DebugManager.getInstance(context);

    await Parser.init().then(() => {});

    const configurationManager = ConfigurationManager2.getInstance();
    enableFormatterDecorators();

    const parserHelper = new AblParserHelper(
        context.extensionPath,
        debugManager
    );
    const formatter = new AblFormatterProvider(parserHelper);
    const globalSettings = new GlobalSettings(configurationManager);

    vscode.workspace.onWillSaveTextDocument((e) => {
        if (
            globalSettings.formatOnSave() &&
            e.document.languageId === Constants.ablId
        ) {
            formatter.formatDocumentOnSave(e.document);
        }
    });

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
}

// This method is called when your extension is deactivated
export function deactivate() {
    //do nothing
}
