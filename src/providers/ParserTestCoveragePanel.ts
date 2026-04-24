import * as vscode from "vscode";
import { generateParserTestHtmlReport } from "../coverage/ParserTestCoverageCalculator";

/**
 * Webview panel for showing parser grammar coverage against functional tests.
 */
export class ParserTestCoveragePanel {
    public static currentPanel: ParserTestCoveragePanel | undefined;

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private readonly disposables: vscode.Disposable[] = [];

    public static readonly viewType = "ablParserTestCoverageReport";

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        void this.update();

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ParserTestCoveragePanel.currentPanel) {
            ParserTestCoveragePanel.currentPanel.panel.reveal(column);
            void ParserTestCoveragePanel.currentPanel.update();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ParserTestCoveragePanel.viewType,
            "Parser vs Tests Coverage",
            column || vscode.ViewColumn.One,
            {
                enableScripts: false,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri],
            }
        );

        ParserTestCoveragePanel.currentPanel = new ParserTestCoveragePanel(
            panel,
            extensionUri
        );
    }

    private async update(): Promise<void> {
        this.panel.title = "Parser vs Tests Coverage";
        this.panel.webview.html = this.getLoadingHtml();
        try {
            const workspaceRoots = (vscode.workspace.workspaceFolders || []).map(
                (folder) => folder.uri.fsPath
            );
            this.panel.webview.html = await generateParserTestHtmlReport(
                this.extensionUri.fsPath,
                workspaceRoots
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.panel.webview.html = this.getErrorHtml(message);
        }
    }

    private getLoadingHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: var(--vscode-font-family, sans-serif); background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-editor-foreground, #d4d4d4); padding: 20px;">
    <h2>Parser vs Tests Coverage</h2>
    <p>Building AST-based coverage report from functional tests...</p>
</body>
</html>`;
    }

    private getErrorHtml(message: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: var(--vscode-font-family, sans-serif); background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-editor-foreground, #d4d4d4); padding: 20px;">
    <h2>Parser vs Tests Coverage</h2>
    <p style="color: #f44336;">Failed to generate report.</p>
    <pre style="white-space: pre-wrap;">${message}</pre>
</body>
</html>`;
    }

    public dispose(): void {
        ParserTestCoveragePanel.currentPanel = undefined;
        this.panel.dispose();

        while (this.disposables.length > 0) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
