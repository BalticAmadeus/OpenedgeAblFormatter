export class CliTelemetry {
    private static reporter: any;

    public static initialize(): void {
        if (this.reporter) {
            return;
        }

        const key =
            process.env.ABL_FORMATTER_TELEMETRY_KEY ||
            process.env.ABL_FORMATTER_TELEMETRY_CONNECTION;

        if (!key || !this.isValidKey(key)) {
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

    // Real instrumentation keys and Application Insights connection strings
    // always contain this segment. Rejecting anything else avoids handing the
    // reporter a malformed value that would otherwise fail silently on every send.
    private static isValidKey(key: string): boolean {
        return key.includes("InstrumentationKey=");
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

    // dispose() flushes buffered/queued events and must be awaited: calling it
    // fire-and-forget (or from a synchronous process "exit" handler) means the
    // process can exit before the flush completes, silently dropping events.
    public static async dispose(): Promise<void> {
        if (!this.reporter) {
            return;
        }

        const reporter = this.reporter;
        this.reporter = undefined;

        try {
            await reporter.dispose();
        } catch {
            // ignore
        }
    }
}