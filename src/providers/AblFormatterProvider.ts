import * as vscode from "vscode";
import { IParserHelper } from "../parser/IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { ConfigurationManager } from "../utils/ConfigurationManager";
import { EOL } from "../model/EOL";
import { DebugManager } from "./DebugManager";
import { Telemetry } from "../utils/Telemetry";

export class AblFormatterProvider
    implements
        vscode.DocumentRangeFormattingEditProvider,
        vscode.DocumentFormattingEditProvider
{
    private parserHelper: IParserHelper;

    public constructor(parserHelper: IParserHelper) {
        this.parserHelper = parserHelper;
    }

    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        console.log("AblFormatterProvider.provideDocumentFormattingEdits");
        Telemetry.increaseFormattingActions("Document");
        Telemetry.addLinesOfCodeFormatted(document.lineCount);

        const configurationManager = ConfigurationManager.getInstance();
        const debugManager = DebugManager.getInstance();

        configurationManager.setTabSize(options.tabSize);

        try {
            const codeFormatter = new FormattingEngine(
                this.parserHelper,
                new FileIdentifier(document.fileName, document.version),
                configurationManager,
                debugManager
            );

            const str = codeFormatter.formatText(
                document.getText(),
                new EOL(document.eol)
            );

            const editor = vscode.window.activeTextEditor;
            editor!.edit(
                (edit: vscode.TextEditorEdit) => {
                    edit.replace(
                        new vscode.Range(
                            new vscode.Position(0, 0),
                            new vscode.Position(10000000, 10000000)
                        ),
                        str
                    );
                },
                { undoStopBefore: false, undoStopAfter: false }
            );
        } catch (e) {
            console.log(e);
            return;
        }
    }

    public provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        console.log("AblFormatterProvider.provideDocumentFormattingEdits");
        Telemetry.increaseFormattingActions("Selection");
        Telemetry.addLinesOfCodeFormatted(range.end.line - range.start.line);

        const configurationManager = ConfigurationManager.getInstance();
        const debugManager = DebugManager.getInstance();

        try {
            const codeFormatter = new FormattingEngine(
                this.parserHelper,
                new FileIdentifier(document.fileName, document.version),
                configurationManager,
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
        console.log(
            "AblFormatterProvider.provideDocumentFormattingEdits2",
            ranges
        );

        switch (ranges.length) {
            case 0:
                return [];
            case 1:
                return this.provideDocumentRangeFormattingEdits(
                    document,
                    ranges[0]
                );
            default:
                // for now, just format whole document, if there is more than one range
                return this.provideDocumentFormattingEdits(document, options);
        }
    }
}
