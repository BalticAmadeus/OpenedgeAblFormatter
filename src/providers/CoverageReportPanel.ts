import * as vscode from "vscode";
import { generateParserHtmlReport, generateTextReport, calculateParserCoverage } from "../coverage/ParserCoverageCalculator";

/**
 * Webview panel for displaying tree-sitter-abl parser coverage report
 * Shows how much of Progress OpenEdge ABL documentation is supported by the grammar.
 */
export class CoverageReportPanel {
    public static currentPanel: CoverageReportPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _disposables: vscode.Disposable[] = [];

    public static readonly viewType = "ablParserCoverageReport";

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.type) {
                    case "refresh":
                        this._update();
                        break;
                    case "exportText":
                        this.exportTextReport();
                        break;
                    case "openLink":
                        if (message.url) {
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                        }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Create or show the coverage report panel
     */
    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (CoverageReportPanel.currentPanel) {
            CoverageReportPanel.currentPanel._panel.reveal(column);
            CoverageReportPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            CoverageReportPanel.viewType,
            "ABL Parser Coverage",
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri],
            }
        );

        CoverageReportPanel.currentPanel = new CoverageReportPanel(
            panel,
            extensionUri
        );
    }

    /**
     * Show coverage summary in output channel
     */
    public static showInOutputChannel() {
        const outputChannel = vscode.window.createOutputChannel(
            "ABL Parser Coverage"
        );
        outputChannel.clear();
        outputChannel.appendLine(generateTextReport());
        outputChannel.show();
    }

    /**
     * Show quick coverage summary in status bar notification
     */
    public static showQuickSummary() {
        const overall = calculateParserCoverage();
        vscode.window.showInformationMessage(
            `Parser Coverage: ${overall.dedicatedRulePercentage}% with dedicated rules (${overall.full} full + ${overall.partial} partial), ${overall.generic} generic parse, ${overall.none} not supported (${overall.total} total features)`
        );
    }

    private async exportTextReport() {
        const content = generateTextReport();
        
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file("abl-parser-coverage-report.txt"),
            filters: {
                "Text files": ["txt"],
                "Markdown files": ["md"],
                "All files": ["*"],
            },
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(
                uri,
                Buffer.from(content, "utf8")
            );
            vscode.window.showInformationMessage(
                `Parser coverage report exported to ${uri.fsPath}`
            );
        }
    }

    private _update() {
        this._panel.title = "ABL Parser Coverage";
        this._panel.webview.html = generateParserHtmlReport();
    }

    public dispose() {
        CoverageReportPanel.currentPanel = undefined;

        // Clean up resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
