export class CliTelemetry {
    private static reporter: any;

    public static initialize(): void {
        if (this.reporter) {
            return;
        }

        const key =
            process.env.ABL_FORMATTER_TELEMETRY_KEY ||
            process.env.ABL_FORMATTER_TELEMETRY_CONNECTION;

        if (!key) {
            return;
        }

        try {
            const telemetryModule = require("@vscode/extension-telemetry");
            const TelemetryReporter = telemetryModule.default ?? telemetryModule.TelemetryReporter;

            if (!TelemetryReporter) {
                return;
            }

            this.reporter = new TelemetryReporter(key);
        } catch {
            this.reporter = undefined;
        }
    }

    public static sendEvent(
        eventName: string,
        properties?: Record<string, string>,
        measures?: Record<string, number>
    ): void {
        if (!this.reporter) {
            return;
        }

        try {
            this.reporter.sendTelemetryEvent(eventName, properties, measures);
        } catch {
            // CLI telemetry must never break formatting.
        }
    }

    public static dispose(): void {
        if (!this.reporter) {
            return;
        }

        try {
            this.reporter.dispose();
        } catch {
            // ignore
        } finally {
            this.reporter = undefined;
        }
    }
}