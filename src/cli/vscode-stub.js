/**
 * Stub for vscode module when running CLI
 * Prevents "Cannot find module 'vscode'" errors in standalone environment
 */

module.exports = {
    // Stub out vscode APIs that might be imported
    ExtensionContext: class {},
    StatusBarAlignment: { Right: 100 },
    StatusBarItem: class {},
    Range: class {},
    Position: class {},
    TextEdit: class {},
    TextDocument: class {},
    window: {
        createStatusBarItem: () => ({}),
        createTextEditorDecorationType: () => ({}),
        activeTextEditor: null,
    },
    workspace: {
        getConfiguration: () => ({
            get: () => null,
        }),
        onDidChangeConfiguration: () => ({}),
    },
    env: {
        isTelemetryEnabled: false,
    },
    commands: {
        registerCommand: () => ({}),
    },
    EndOfLine: {
        LF: 1,
        CRLF: 2,
    },
};
