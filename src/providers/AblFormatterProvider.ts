import * as vscode from "vscode";
import { IParserHelper } from "../parser/IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { FormattingEngine } from "../v2/formatterFramework/FormattingEngine";
import { ConfigurationManager2 } from "../utils/ConfigurationManager";
import { EOL } from "../v2/model/EOL";
import { DebugManager } from "./DebugManager";

export class AblFormatterProvider
    implements
        vscode.DocumentRangeFormattingEditProvider,
        vscode.DocumentFormattingEditProvider
{
    private readonly parserHelper: IParserHelper;
    private readonly configurationManager: ConfigurationManager2 =
        ConfigurationManager2.getInstance();

    public constructor(parserHelper: IParserHelper) {
        this.parserHelper = parserHelper;
    }

    public formatDocumentOnSave(document: vscode.TextDocument): void {
        const options: vscode.FormattingOptions = {
            insertSpaces: true,
            tabSize: 4, //TODO fix
        };

        this.configurationManager.setTabSize(options.tabSize);

        this.configurationManager.useOnSaveSettings(true);

        try {
            this.provideDocumentFormattingEdits(document, options);
        } catch (e) {
            console.log(e);
        } finally {
            this.configurationManager.useOnSaveSettings(false);
        }
    }

    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        const fullRange = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(10000000, 10000000)
        );

        this.provideDocumentRangeFormattingEdits(document, fullRange, options);

        return [];
    }

    public provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        const debugManager = DebugManager.getInstance();

        this.configurationManager.setTabSize(options.tabSize);

        try {
            const codeFormatter = new FormattingEngine(
                this.parserHelper,
                new FileIdentifier(document.fileName, document.version),
                this.configurationManager,
                debugManager
            );

            const str = codeFormatter.formatText(
                document.getText(range),
                new EOL(document.eol)
            );

            const editor = vscode.window.activeTextEditor;
            editor!.edit(
                (edit: vscode.TextEditorEdit) => {
                    edit.replace(range, str);
                },
                { undoStopBefore: false, undoStopAfter: false }
            );
        } catch (e) {
            console.log(e);
            return;
        }
    }

    provideDocumentRangesFormattingEdits?(
        document: vscode.TextDocument,
        ranges: vscode.Range[],
        options: vscode.FormattingOptions
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        switch (ranges.length) {
            case 0:
                return [];
            case 1:
                return this.provideDocumentRangeFormattingEdits(
                    document,
                    ranges[0],
                    options
                );
            default:
                // for now, just format whole document, if there is more than one range
                return this.provideDocumentFormattingEdits(document, options);
        }
    }
}
