// File: src/providers/FormatterPreviewPanel.ts
import * as vscode from "vscode";
import { IParserHelper } from "../parser/IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import * as path from "path";
import * as fs from "fs";
import { EOL } from "../model/EOL";

interface FormatterSetting {
    key: string;
    label: string;
    type: "boolean" | "enum";
    default: any;
    enum?: string[];
    description: string;
    order: number;
    category: string;
}

export class FormatterPreviewPanel {
    public static currentPanel: FormatterPreviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _parserHelper: IParserHelper;
    private _disposables: vscode.Disposable[] = [];
    private _currentSampleCode: string = "";
    private _currentSampleName: string = "assign1.p";
    private _currentSettings: Record<string, any> = {};

    public static createOrShow(
        extensionUri: vscode.Uri,
        parserHelper: IParserHelper
    ) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (FormatterPreviewPanel.currentPanel) {
            FormatterPreviewPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            "ablFormatterPreview",
            "ABL Formatter Preview",
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, "resources"),
                ],
            }
        );

        FormatterPreviewPanel.currentPanel = new FormatterPreviewPanel(
            panel,
            extensionUri,
            parserHelper
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        parserHelper: IParserHelper
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._parserHelper = parserHelper;

        // Load initial sample
        this.loadSample(this._currentSampleName);

        // Ensure we have valid sample code
        if (
            !this._currentSampleCode ||
            this._currentSampleCode.trim().length === 0
        ) {
            console.warn("No valid sample code, using default");
            this._currentSampleCode = this.getDefaultSampleCode();
        }

        // Get current settings
        this._currentSettings = this.getAllFormatterSettings();

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.type) {
                    case "settingChanged":
                        this.handleSettingChange(message.key, message.value);
                        break;
                    case "sampleChanged":
                        this.loadSample(message.sample);
                        this.updatePreview();
                        break;
                    case "applySettings":
                        this.applySettings(message.settings);
                        break;
                    case "resetSettings":
                        this.resetSettings();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private loadSample(sampleName: string) {
        try {
            // First try the extension path
            let samplePath = path.join(
                this._extensionUri.fsPath,
                "resources",
                "samples",
                sampleName
            );

            // If not found, check if we're in development mode
            if (!fs.existsSync(samplePath)) {
                // In packaged extension, samples might not be included
                // Use a default sample code instead
                this._currentSampleCode = this.getDefaultSampleCode();
                this._currentSampleName = "default";
                return;
            }

            let content = fs.readFileSync(samplePath, "utf8");
            if (!content || content.trim().length === 0) {
                throw new Error("Sample file is empty");
            }

            // *** ADD THIS: Strip formatterSettingsOverride comment ***
            content = content
                .replace(
                    /\/\*+\s*formatterSettingsOverride\s*\*\/[\s\r\n]*\/\*+[\s\S]*?\*\//i,
                    ""
                )
                .trim();

            this._currentSampleCode = content;
            this._currentSampleName = sampleName;
        } catch (error) {
            console.error("Error loading sample:", error);
            this._currentSampleCode = this.getDefaultSampleCode();
            this._currentSampleName = "default";
        }
    }

    private getDefaultSampleCode(): string {
        return `/* Sample ABL Code for Formatting Preview */

        DEFINE VARIABLE jsonTableRow AS INT NO-UNDO.
        DEFINE VARIABLE jsonTableRow2 AS INT NO-UNDO.

        ASSIGN
            jsonTableRow = IF TRUE THEN 1 ELSE 2
            jsonTableRow2222 = 2
        .

        IF TRUE THEN
            ASSIGN jsonTableRow2222 = "1" + STRING(10000).

        IF TRUE THEN
            ASSIGN
                jsonTableRow2222 = "1" + STRING(10000)
                jsonTableRow2222 = "1" + STRING(10000)
            .

        FOR EACH Customer NO-LOCK WHERE
            Customer.CustNum > 100:
            DISPLAY Customer.Name.
        END.

        CASE expression:
            WHEN "value1" THEN DO:
                MESSAGE "Case 1".
            END.
            WHEN "value2" THEN DO:
                MESSAGE "Case 2".
            END.
            OTHERWISE DO:
                MESSAGE "Default".
            END.
        END CASE.`;
    }

    private getAllFormatterSettings(): Record<string, any> {
        const config = vscode.workspace.getConfiguration("AblFormatter");
        const settings: Record<string, any> = {};

        const allSettings = this.getFormatterSettingsMetadata();
        for (const setting of allSettings) {
            settings[setting.key] = config.get(setting.key, setting.default);
        }

        return settings;
    }

    private getFormatterSettingsMetadata(): FormatterSetting[] {
        const packageJson = require(path.join(
            this._extensionUri.fsPath,
            "package.json"
        ));
        const properties =
            packageJson.contributes?.configuration?.properties || {};

        const settings: FormatterSetting[] = [];

        for (const [fullKey, config] of Object.entries(properties)) {
            if (!fullKey.startsWith("AblFormatter.")) continue;
            if (fullKey === "AblFormatter.showTreeInfoOnHover") continue;

            const key = fullKey.replace("AblFormatter.", "");
            const configAny = config as any;

            // Categorize settings
            let category = "Other";
            if (key.includes("assign")) category = "Assign";
            else if (key.includes("if") && !key.includes("Function"))
                category = "If Statement";
            else if (key.includes("ifFunction")) category = "If Function";
            else if (key.includes("case")) category = "Case";
            else if (key.includes("for")) category = "For";
            else if (key.includes("find")) category = "Find";
            else if (key.includes("block")) category = "Block";
            else if (key.includes("temptable")) category = "Temp-Table";
            else if (key.includes("using")) category = "Using";
            else if (key.includes("body")) category = "Body";
            else if (key.includes("property")) category = "Property";
            else if (key.includes("enum")) category = "Enum";
            else if (key.includes("variableDefinition"))
                category = "Variable Definition";
            else if (key.includes("procedureParameter"))
                category = "Procedure Parameter";
            else if (key.includes("functionParameter"))
                category = "Function Parameter";
            else if (key.includes("arrayAccess")) category = "Array Access";
            else if (key.includes("expression")) category = "Expression";
            else if (key.includes("statement")) category = "Statement";
            else if (key.includes("variableAssignment"))
                category = "Variable Assignment";

            settings.push({
                key: key,
                label: this.formatLabel(key),
                type: configAny.type === "boolean" ? "boolean" : "enum",
                default: configAny.default,
                enum: configAny.enum,
                description: configAny.description || "",
                order: configAny.order || 9999,
                category: category,
            });
        }

        // Sort by order
        settings.sort((a, b) => a.order - b.order);

        return settings;
    }

    private formatLabel(key: string): string {
        // Convert camelCase to Title Case with spaces
        return key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    }

    private async handleSettingChange(key: string, value: any) {
        this._currentSettings[key] = value;
        await this.updatePreview();
    }

    private async updatePreview() {
        try {
            // Validate sample code first
            if (
                !this._currentSampleCode ||
                typeof this._currentSampleCode !== "string"
            ) {
                throw new Error(
                    `Invalid sample code: ${typeof this._currentSampleCode}`
                );
            }

            if (this._currentSampleCode.length === 0) {
                throw new Error("Sample code is empty");
            }

            // Create a temporary settings object with all required fields
            const tempSettings: Record<string, any> = {};

            // Convert setting keys back to full format
            for (const [key, value] of Object.entries(this._currentSettings)) {
                tempSettings[`AblFormatter.${key}`] = value;
            }

            // DON'T add prefix to these - they're not AblFormatter settings
            tempSettings.tabSize = 4;
            tempSettings.eol = { eolDel: "\r\n" };

            const { eol, tabSize, ...formatterSettings } = tempSettings;

            const formattedCode = await this._parserHelper.format(
                new FileIdentifier("preview.p", 1),
                this._currentSampleCode,
                {
                    settings: formatterSettings,
                    eol: eol,
                    tabSize: tabSize,
                }
            );

            // Check if formattedCode is valid
            if (typeof formattedCode !== "string") {
                throw new Error(
                    `Formatter returned invalid result type: ${typeof formattedCode}`
                );
            }

            if (formattedCode.length === 0) {
                console.warn("Formatter returned empty string");
            }

            this._panel.webview.postMessage({
                type: "previewUpdated",
                original: this._currentSampleCode,
                formatted: formattedCode,
            });
        } catch (error) {
            console.error("=== Preview update error ===");
            console.error("Error type:", error?.constructor?.name);
            console.error(
                "Error message:",
                error instanceof Error ? error.message : String(error)
            );
            console.error(
                "Error stack:",
                error instanceof Error ? error.stack : "No stack trace"
            );
            console.error("================================");

            this._panel.webview.postMessage({
                type: "previewError",
                error:
                    error instanceof Error
                        ? `${error.message}\n\nCheck Developer Tools console for details.`
                        : String(error),
            });
        }
    }

    private async applySettings(settings: Record<string, any>) {
        const config = vscode.workspace.getConfiguration("AblFormatter");

        try {
            for (const [key, value] of Object.entries(settings)) {
                await config.update(
                    key,
                    value,
                    vscode.ConfigurationTarget.Global
                );
            }
            vscode.window.showInformationMessage(
                "Formatter settings applied successfully!"
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to apply settings: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    private async resetSettings() {
        const settings = this.getFormatterSettingsMetadata();
        const defaultSettings: Record<string, any> = {};

        for (const setting of settings) {
            defaultSettings[setting.key] = setting.default;
        }

        this._currentSettings = defaultSettings;

        this._panel.webview.postMessage({
            type: "settingsReset",
            settings: defaultSettings,
        });

        await this.updatePreview();
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const settings = this.getFormatterSettingsMetadata();

        // Get sample files - handle if directory doesn't exist
        let sampleFiles: string[] = ["default"];
        const samplesPath = path.join(
            this._extensionUri.fsPath,
            "resources",
            "samples"
        );

        if (fs.existsSync(samplesPath)) {
            try {
                sampleFiles = fs
                    .readdirSync(samplesPath)
                    .filter(
                        (f) =>
                            f.endsWith(".p") ||
                            f.endsWith(".cls") ||
                            f.endsWith(".i")
                    )
                    .sort();
            } catch (error) {
                console.error("Error reading samples directory:", error);
            }
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ABL Formatter Preview</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .toolbar {
            display: flex;
            gap: 10px;
            padding: 10px;
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            align-items: center;
        }

        .toolbar select {
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 4px 8px;
            font-size: 13px;
        }

        .toolbar button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 13px;
        }

        .toolbar button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .main-container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        .settings-panel {
            width: 350px;
            overflow-y: auto;
            border-right: 1px solid var(--vscode-panel-border);
            padding: 15px;
            background-color: var(--vscode-sideBar-background);
        }

        .preview-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .preview-container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        .code-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .code-section + .code-section {
            border-left: 1px solid var(--vscode-panel-border);
        }

        .code-header {
            padding: 8px 12px;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            color: var(--vscode-descriptionForeground);
        }

        .code-content {
            flex: 1;
            overflow: auto;
            padding: 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.5;
            white-space: pre;
        }

        .setting-category {
            margin-bottom: 20px;
        }

        .category-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 5px;
        }

        .setting-item {
            margin-bottom: 12px;
            padding-left: 8px;
        }

        .setting-item label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 13px;
        }

        .setting-item input[type="checkbox"] {
            cursor: pointer;
        }

        .setting-item select {
            margin-left: 24px;
            margin-top: 4px;
            width: calc(100% - 24px);
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 4px 8px;
            font-size: 12px;
        }

        .setting-description {
            margin-left: 24px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 2px;
        }

        .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            margin: 10px;
        }
        
        @keyframes flash {
            0%, 100% { background-color: var(--vscode-editor-background); }
            50% { background-color: var(--vscode-editor-selectionBackground); }
        }

        .code-content.updating {
            animation: flash 0.3s ease-in-out;
        }
            
        .code-content {
            flex: 1;
            overflow: auto;
            padding: 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.5;
            /* Remove: white-space: pre; */
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        ${
            sampleFiles.length > 1
                ? `
        <label>Sample:</label>
        <select id="sampleSelect">
            ${sampleFiles
                .map(
                    (file) =>
                        `<option value="${file}" ${
                            file === this._currentSampleName ? "selected" : ""
                        }>${file}</option>`
                )
                .join("")}
        </select>
        `
                : ""
        }
        <button id="applyBtn">Apply Settings</button>
        <button id="resetBtn">Reset to Defaults</button>
    </div>

    <div class="main-container">
        <div class="settings-panel">
            ${this.generateSettingsHtml(settings)}
        </div>

        <div class="preview-panel">
            <div class="preview-container">
                <div class="code-section">
                    <div class="code-header">Original Code</div>
                    <div class="code-content" id="originalCode">${this.escapeHtml(
                        this._currentSampleCode
                    )}</div>
                </div>
                <div class="code-section">
                    <div class="code-header">Formatted Code</div>
                    <div class="code-content" id="formattedCode">Loading...</div>
                </div>
            </div>
        </div>
    </div>

        <script>
        const vscode = acquireVsCodeApi();
        let currentSettings = ${JSON.stringify(this._currentSettings)};
        let isUpdating = false;

        // Initialize
        updatePreview();

        // Sample selector
        const sampleSelect = document.getElementById('sampleSelect');
        if (sampleSelect) {
            sampleSelect.addEventListener('change', (e) => {
                document.getElementById('formattedCode').textContent = 'Loading...';
                vscode.postMessage({
                    type: 'sampleChanged',
                    sample: e.target.value
                });
            });
        }

        // Apply button
        document.getElementById('applyBtn').addEventListener('click', () => {
            vscode.postMessage({
                type: 'applySettings',
                settings: currentSettings
            });
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            document.getElementById('formattedCode').textContent = 'Resetting...';
            vscode.postMessage({
                type: 'resetSettings'
            });
        });

        // Setting changes - debounced
        let updateTimeout = null;
        
        function triggerUpdate(key, value) {
            currentSettings[key] = value;
            
            // Clear any pending update
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            
            // Debounce updates by 300ms
            updateTimeout = setTimeout(() => {
                vscode.postMessage({
                    type: 'settingChanged',
                    key: key,
                    value: value
                });
            }, 300);
        }

        document.querySelectorAll('.setting-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                const value = e.target.checked;
                triggerUpdate(key, value);
            });
        });

        document.querySelectorAll('.setting-enum').forEach(select => {
            select.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                const value = e.target.value;
                triggerUpdate(key, value);
            });
        });

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'previewUpdated':
                    const originalContainer = document.getElementById('originalCode');
                    const formattedContainer = document.getElementById('formattedCode');
                    
                    if (originalContainer && formattedContainer) {
                        // Save scroll positions
                        const formattedScrollTop = formattedContainer.scrollTop;
                        const originalScrollTop = originalContainer.scrollTop;
                        
                        // Update content only (don't recreate elements)
                        originalContainer.textContent = message.original;
                        formattedContainer.textContent = message.formatted;
                        
                        // Restore scroll positions
                        formattedContainer.scrollTop = formattedScrollTop;
                        originalContainer.scrollTop = originalScrollTop;
                    }
                    break;
                    
                case 'sampleLoaded':
                    document.getElementById('originalCode').textContent = message.original;
                    document.getElementById('formattedCode').textContent = 'Formatting...';
                    break;
                    
                case 'previewError':
                    console.error('[Webview] Preview error:', message.error);
                    isUpdating = false;
                    document.getElementById('formattedCode').innerHTML = 
                        '<div class="error-message">Error: ' + message.error + '</div>';
                    break;
                    
                case 'settingsReset':
                    currentSettings = message.settings;
                    // Update UI checkboxes and selects
                    for (const [key, value] of Object.entries(message.settings)) {
                        const checkbox = document.querySelector(\`.setting-checkbox[data-key="\${key}"]\`);
                        if (checkbox) {
                            checkbox.checked = value;
                        }
                        const select = document.querySelector(\`.setting-enum[data-key="\${key}"]\`);
                        if (select) {
                            select.value = value;
                        }
                    }
                    break;
                    
                default:
                    console.warn('[Webview] Unknown message type:', message.type);
            }
        });

        function updatePreview() {
            // Trigger initial preview
            if (Object.keys(currentSettings).length > 0) {
                const firstKey = Object.keys(currentSettings)[0];
                vscode.postMessage({
                    type: 'settingChanged',
                    key: firstKey,
                    value: currentSettings[firstKey]
                });
            }
        }
    </script>
</body>
</html>`;
    }

    private generateSettingsHtml(settings: FormatterSetting[]): string {
        const categories = new Map<string, FormatterSetting[]>();

        // Group by category
        for (const setting of settings) {
            if (!categories.has(setting.category)) {
                categories.set(setting.category, []);
            }
            categories.get(setting.category)!.push(setting);
        }

        let html = "";

        for (const [category, categorySettings] of categories) {
            html += `<div class="setting-category">`;
            html += `<div class="category-title">${category}</div>`;

            for (const setting of categorySettings) {
                html += `<div class="setting-item">`;

                if (setting.type === "boolean") {
                    const checked = this._currentSettings[setting.key]
                        ? "checked"
                        : "";
                    html += `
                        <label>
                            <input type="checkbox" class="setting-checkbox" 
                                data-key="${setting.key}" ${checked}>
                            <span>${setting.label}</span>
                        </label>
                    `;
                } else if (setting.type === "enum") {
                    html += `
                        <label>${setting.label}</label>
                        <select class="setting-enum" data-key="${setting.key}">
                            ${setting
                                .enum!.map(
                                    (opt) =>
                                        `<option value="${opt}" ${
                                            this._currentSettings[
                                                setting.key
                                            ] === opt
                                                ? "selected"
                                                : ""
                                        }>${opt}</option>`
                                )
                                .join("")}
                        </select>
                    `;
                }

                if (setting.description) {
                    html += `<div class="setting-description">${setting.description}</div>`;
                }

                html += `</div>`;
            }

            html += `</div>`;
        }

        return html;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    public dispose() {
        FormatterPreviewPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
