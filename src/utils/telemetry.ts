import TelemetryReporter from "@vscode/extension-telemetry";
import * as vscode from "vscode";
export class Telemetry {
    private static instance: TelemetryReporter;
    private static treeSitterErrors: number = 0;
    private static linesOfCodeFormatted: number = 0;
    private static fullFormattingActions: number = 0;
    private static selectionFormattingActions: number = 0;
    private static sendThreshold: number = 5;
    private static readonly TELEMETRY_KEY =
        "46efa758-98ee-417f-88bb-397d4f2ca82b";

    private constructor() {}

    public static initialize(): void {
        if (!Telemetry.instance) {
            Telemetry.instance = new TelemetryReporter(this.TELEMETRY_KEY);
        }
    }

    public static getInstance(): TelemetryReporter {
        if (!Telemetry.instance) {
            throw new Error(
                "TelemetryReporter is not initialized. Call initialize() first."
            );
        }
        return Telemetry.instance;
    }

    public static addTreeSitterErrors(errorCount: number): void {
        this.treeSitterErrors += errorCount;
    }

    public static addLinesOfCodeFormatted(lines: number): void {
        this.linesOfCodeFormatted += lines;
    }

    public static increaseFormattingActions(type: string): void {
        switch (type) {
            case "Document":
                this.fullFormattingActions++;
                break;
            case "Selection":
                this.selectionFormattingActions++;
                break;
        }

        this.sendAllTelemetry();
    }

    public static sendTreeSitterErrors(): void {
        let errorsPerLocf = 0;
        if (this.treeSitterErrors !== 0)
            errorsPerLocf =
                (this.treeSitterErrors * 1.0) / this.linesOfCodeFormatted;

        Telemetry.instance.sendTelemetryEvent(
            "TreeSitterErrors",
            {},
            {
                errorsPerLocf,
                linesOfCodeFormatted: this.linesOfCodeFormatted,
                treeSitterErrors: this.treeSitterErrors,
            }
        );
    }

    public static sendFormattingActions(): void {
        if (!this.fullFormattingActions && !this.selectionFormattingActions) {
            return;
        }

        Telemetry.instance.sendTelemetryEvent(
            "FormattingActions",
            {},
            {
                fullFormat: this.fullFormattingActions,
                selectionFormat: this.selectionFormattingActions,
            }
        );
    }

    public static sendExtensionSettings(): void {
        const configuration = vscode.workspace.getConfiguration("AblFormatter");
        const settings = configuration.inspect("");
        console.log("Sending Extension Settings", configuration);
        if (settings) {
            Telemetry.instance.sendTelemetryEvent(
                "ExtensionSettings",
                { settings: configuration } as { [key: string]: any },
                {}
            );
        }
    }

    public static sendAllTelemetry(): void {
        if (
            this.fullFormattingActions + this.selectionFormattingActions <
            this.sendThreshold
        )
            return;

        this.sendTreeSitterErrors();
        this.sendFormattingActions();
        this.resetVariables();
    }

    private static resetVariables(): void {
        this.treeSitterErrors = 0;
        this.linesOfCodeFormatted = 0;
        this.fullFormattingActions = 0;
        this.selectionFormattingActions = 0;
    }
}
