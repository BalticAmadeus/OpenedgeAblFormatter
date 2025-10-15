import * as vscode from "vscode";
import { IParserHelper } from "../parser/IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
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
        console.log(
            "[AblFormatterProvider] Starting async document formatting"
        );
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
            console.log("[AblFormatterProvider] Starting async document formatting (worker-only)");

            const allSettings = configurationManager.getAll();
            allSettings.eol = new EOL(document.eol);

            const formattedText = await this.parserHelper.format(
                new FileIdentifier(document.fileName, document.version),
                document.getText(),
                allSettings
            );

            console.log("[AblFormatterProvider] Formatting completed successfully");

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
            console.error("[AblFormatterProvider] Formatting failed:", error);
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
        range: vscode.Range
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        console.log("[AblFormatterProvider] Starting async range formatting");
        Telemetry.increaseFormattingActions("Selection");
        Telemetry.addLinesOfCodeFormatted(range.end.line - range.start.line);

        const configurationManager = ConfigurationManager.getInstance();
        const debugManager = DebugManager.getInstance();

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
            console.log(
                "[AblFormatterProvider] Starting async range formatting (worker-only)"
            );

            const allSettings = configurationManager.getAll();
            allSettings.eol = new EOL(document.eol);

            const formattedText = await this.parserHelper.format(
                new FileIdentifier(document.fileName, document.version),
                document.getText(range),
                allSettings
            );

            console.log(
                "[AblFormatterProvider] Range formatting completed successfully"
            );

            return [
                vscode.TextEdit.replace(range, formattedText),
            ];
        } catch (error) {
            console.error("[AblFormatterProvider] Range formatting failed:", error);
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
