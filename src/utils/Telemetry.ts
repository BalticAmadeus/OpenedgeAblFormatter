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
        "InstrumentationKey=5ee68587-b91d-41b6-ba02-4c65e5348310;IngestionEndpoint=https://northeurope-2.in.applicationinsights.azure.com/;LiveEndpoint=https://northeurope.livediagnostics.monitor.azure.com/;ApplicationId=b19474b9-14c6-4c39-b5ba-0c843036cbb0";

    private constructor() {}

    public static getInstance(): TelemetryReporter {
        if (!Telemetry.instance) {
            Telemetry.instance = new TelemetryReporter(this.TELEMETRY_KEY);
        }
        return Telemetry.instance;
    }

    private static isTelemetryEnabled(): boolean {
        const isFormatterTelemetryOn = vscode.workspace
            .getConfiguration("Telemetry")
            .get("ablFormatterTelemetry") as boolean;
        const isGlobalTelemetryOn = vscode.env.isTelemetryEnabled;

        return isFormatterTelemetryOn && isGlobalTelemetryOn;
    }

    public static addTreeSitterErrors(errorCount: number): void {
        if (!this.isTelemetryEnabled()) {
            return;
        }
        this.treeSitterErrors += errorCount;
    }

    public static addLinesOfCodeFormatted(lines: number): void {
        if (!this.isTelemetryEnabled()) {
            return;
        }
        this.linesOfCodeFormatted += lines;
    }

    public static increaseFormattingActions(type: string): void {
        if (!this.isTelemetryEnabled()) {
            return;
        }

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
        if (!this.isTelemetryEnabled()) {
            return;
        }

        let errorsPerLocf = 0;
        if (this.treeSitterErrors !== 0) {
            errorsPerLocf =
                (this.treeSitterErrors * 1.0) / this.linesOfCodeFormatted;
        }

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
        if (
            !this.fullFormattingActions &&
            !this.selectionFormattingActions &&
            !this.isTelemetryEnabled()
        ) {
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
        if (!this.isTelemetryEnabled()) {
            return;
        }

        const configuration = vscode.workspace.getConfiguration("AblFormatter");

        if (configuration) {
            Telemetry.instance.sendTelemetryEvent(
                "ExtensionSettings",
                { settings: configuration } as { [key: string]: any },
                {}
            );
        }
    }

    private static totalFormattingActions(): number {
        return this.fullFormattingActions + this.selectionFormattingActions;
    }

    public static sendAllTelemetry(): void {
        if (
            this.totalFormattingActions() < this.sendThreshold ||
            !this.isTelemetryEnabled()
        ) {
            return;
        }

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
