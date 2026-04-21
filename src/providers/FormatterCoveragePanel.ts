import * as vscode from "vscode";
import { generateFormatterHtmlReport } from "../coverage/ParserCoverageCalculator";
import { calculateFormatterStats, getOverallFormatterCoverage } from "../coverage/FormatterCoverageData";

/**
 * Webview panel for displaying formatter coverage report.
 * Shows the approximate coverage of each formatter against documented ABL constructs.
 */
export class FormatterCoveragePanel {
    public static currentPanel: FormatterCoveragePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _disposables: vscode.Disposable[] = [];

    public static readonly viewType = "ablFormatterCoverageReport";

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    /**
     * Create or show the formatter coverage report panel
     */
    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (FormatterCoveragePanel.currentPanel) {
            FormatterCoveragePanel.currentPanel._panel.reveal(column);
            FormatterCoveragePanel.currentPanel._update();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            FormatterCoveragePanel.viewType,
            "ABL Formatter Coverage",
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri],
            }
        );

        FormatterCoveragePanel.currentPanel = new FormatterCoveragePanel(
            panel,
            extensionUri
        );
    }

    /**
     * Show a quick summary of formatter coverage in a notification
     */
    public static showQuickSummary() {
        const overallScore = getOverallFormatterCoverage();
        const stats = calculateFormatterStats();
        const top = stats.sort((a, b) => b.approximateScore - a.approximateScore).slice(0, 3);
        vscode.window.showInformationMessage(
            `Formatter Coverage: ~${overallScore}% overall. Top: ${top.map(s => `${s.formatterDir} (${s.approximateScore}%)`).join(", ")}`
        );
    }

    private _update() {
        this._panel.title = "ABL Formatter Coverage";
        this._panel.webview.html = generateFormatterHtmlReport();
    }

    public dispose() {
        FormatterCoveragePanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
