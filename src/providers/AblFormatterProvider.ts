import * as vscode from "vscode";
import { IParserHelper } from "../parser/IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { ConfigurationManager } from "../utils/ConfigurationManager";
import { EOL } from "../model/EOL";
import { DebugManager } from "./DebugManager";
import { MetamorphicEngine } from "../mtest/MetamorphicEngine";
import { Telemetry } from "../utils/Telemetry";
import { BaseEngineOutput } from "../mtest/EngineParams";

export class AblFormatterProvider
    implements
        vscode.DocumentRangeFormattingEditProvider,
        vscode.DocumentFormattingEditProvider
{
    private readonly parserHelper: IParserHelper;
    private readonly metamorphicTestingEngine: MetamorphicEngine<BaseEngineOutput>;

    public constructor(
        parserHelper: IParserHelper,
        metamorphicTestingEngine: MetamorphicEngine<BaseEngineOutput>
    ) {
        this.parserHelper = parserHelper;
        this.metamorphicTestingEngine = metamorphicTestingEngine;
    }

    public provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        debugger; // Check if this is called
        console.log('[AblFormatterProvider] provideDocumentFormattingEdits called');
        Telemetry.increaseFormattingActions("Document");
        Telemetry.addLinesOfCodeFormatted(document.lineCount);

        const configurationManager = ConfigurationManager.getInstance();
        const debugManager = DebugManager.getInstance();

        configurationManager.setTabSize(options.tabSize);

        // Return a promise for async formatting
        return this.performAsyncDocumentFormatting(
            document,
            configurationManager,
            debugManager
        );
    }

    private async performAsyncDocumentFormatting(
        document: vscode.TextDocument,
        configurationManager: ConfigurationManager,
        debugManager: DebugManager
    ): Promise<vscode.TextEdit[]> {
        try {
            console.log('[AblFormatterProvider] performAsyncDocumentFormatting starting');
            const allSettings = configurationManager.getAll();
            allSettings.eol = new EOL(document.eol);

            console.log('[AblFormatterProvider] Calling parserHelper.format');
            const formattedText = await this.parserHelper.format(
                new FileIdentifier(document.fileName, document.version),
                document.getText(),
                allSettings
            );

            console.log('[AblFormatterProvider] Formatting complete, formattedText length:', formattedText.length);
            // Return the TextEdit for the whole document
            return [
                vscode.TextEdit.replace(
                    new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(document.lineCount, 0)
                    ),
                    formattedText
                ),
            ];
        } catch (error) {
            console.error('[AblFormatterProvider] Error during formatting:', error);
            vscode.window.showErrorMessage(
                `ABL Formatter: Failed to format document - ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            return [];
        }
    }

    public provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        Telemetry.increaseFormattingActions("Selection");
        Telemetry.addLinesOfCodeFormatted(range.end.line - range.start.line);

        const configurationManager = ConfigurationManager.getInstance();
        const debugManager = DebugManager.getInstance();

        configurationManager.setTabSize(options.tabSize);

        // Return a promise for async formatting
        return this.performAsyncRangeFormatting(
            document,
            range,
            configurationManager,
            debugManager
        );
    }

    private async performAsyncRangeFormatting(
        document: vscode.TextDocument,
        range: vscode.Range,
        configurationManager: ConfigurationManager,
        debugManager: DebugManager
    ): Promise<vscode.TextEdit[]> {
        try {
            const allSettings = configurationManager.getAll();
            allSettings.eol = new EOL(document.eol);

            const formattedText = await this.parserHelper.format(
                new FileIdentifier(document.fileName, document.version),
                document.getText(range),
                allSettings
            );

            return [vscode.TextEdit.replace(range, formattedText)];
        } catch (error) {
            vscode.window.showErrorMessage(
                `ABL Formatter: Failed to format range - ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            return [];
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
