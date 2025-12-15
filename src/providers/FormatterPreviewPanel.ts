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
    private _currentSettings: Record<string, any> = {};
    private _expandedCategory: string = "";
    private _expandedCategories: Set<string> = new Set();


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
                    case "settingsChanged":
                        this._currentSettings = message.settings;
                        this._expandedCategories = new Set(message.expandedCategories);
                        this.updatePreview(message.expandedCategories);
                        break;
                    case "categoriesChanged":
                        this._expandedCategories = new Set(message.expandedCategories);
                        this.updatePreview(message.expandedCategories);
                        break;
                    case "settingChanged":
                        this.handleSettingChange(message.key, message.value, message.category);
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

    private getCategorySampleMap(): Record<string, string> {
    return {
        "Assign": `
/* ASSIGN Statement */
DEFINE VARIABLE c AS CHARACTER NO-UNDO.
ASSIGN
    c = c + " " + "test"
    .
`,
        "If Statement": `
/* IF Statement */
DEFINE VARIABLE mss_username AS CHARACTER NO-UNDO.
IF mss_username <> ? AND
    mss_username <> "" THEN MESSAGE "A".
`,
        "For": `
/* FOR EACH with WHERE */
FOR EACH Customer NO-LOCK WHERE
    Customer.CustNum > 100 AND
    Customer.Country = "USA":
    DISPLAY Customer.Name Customer.City.
END.
`,
        "Find": `
/* FIND Statement */
DEFINE VARIABLE iCount AS INTEGER NO-UNDO.
FIND FIRST Customer NO-LOCK WHERE
    Customer.CustNum = iCount NO-ERROR.
`,
        "Block": `
/* Nested DO Blocks */
DO WHILE TRUE:
    DO WHILE TRUE:
        DO WHILE TRUE:
            MESSAGE "a".
        END.
    END.
END.
`,
        "Case": `
/* CASE Statement */
DEFINE VARIABLE s AS CHARACTER NO-UNDO.
CASE s:
    WHEN "A" THEN
        MESSAGE "Letter A".
    WHEN "B" THEN
        MESSAGE "Letter B".
    OTHERWISE
        MESSAGE "Letter not recognized".
END CASE.
`
    };
}

    private getAllCategories(settingsMeta: FormatterSetting[]): string[] {
        const categories = new Set<string>();
        for (const s of settingsMeta) categories.add(s.category);
        return Array.from(categories);
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
            if (!fullKey.startsWith("AblFormatter.")) {continue;}
            if (fullKey === "AblFormatter.showTreeInfoOnHover") {continue;}

            const key = fullKey.replace("AblFormatter.", "");
            const configAny = config as any;

            // Categorize settings
            let category = "Other";
            if (key.includes("assign")) { category = "Assign"; }
            else if (key.includes("if") && !key.includes("Function")) {
                category = "If Statement";
            }
            else if (key.includes("ifFunction")) { category = "If Function"; }
            else if (key.includes("case")) { category = "Case"; }
            else if (key.includes("for")) { category = "For"; }
            else if (key.includes("find")) { category = "Find"; }
            else if (key.includes("block")) { category = "Block"; }
            else if (key.includes("temptable")) { category = "Temp-Table"; }
            else if (key.includes("using")) { category = "Using"; }
            else if (key.includes("body")) { category = "Body"; }
            else if (key.includes("property")) { category = "Property"; }
            else if (key.includes("enum")) { category = "Enum"; }
            else if (key.includes("variableDefinition")) {
                category = "Variable Definition";
            }
            else if (key.includes("procedureParameter")) {
                category = "Procedure Parameter";
            }
            else if (key.includes("functionParameter")) {
                category = "Function Parameter";
            }
            else if (key.includes("arrayAccess")) { category = "Array Access"; }
            else if (key.includes("expression")) { category = "Expression"; }
            else if (key.includes("statement")) { category = "Statement"; }
            else if (key.includes("variableAssignment")) {
                category = "Variable Assignment";
            }

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

    private async handleSettingChange(key: string, value: any, category?: string) {
        this._currentSettings[key] = value;
        await this.updatePreview(category ? [category] : undefined);
    }

        private async updatePreview(expandedCategories?: string[]) {
        try {
            const settingsMeta = this.getFormatterSettingsMetadata();
            const categoryMap = this.getCategorySampleMap();
            const categories = this.getAllCategories(settingsMeta);

            // Use provided expanded categories or current state
            const expanded = expandedCategories || Array.from(this._expandedCategories);
            if (expanded.length === 0) { expanded.push(categories[0]); } // Always show at least one

            // Join code samples for all expanded categories
            const sampleCode = expanded.length
                ? expanded.map(cat => categoryMap[cat] || "").join("\n\n").trim()
                : "";

            // Prepare settings as before
            const tempSettings: Record<string, any> = {};
            for (const [key, value] of Object.entries(this._currentSettings)) {
                tempSettings[`AblFormatter.${key}`] = value;
            }
            tempSettings.tabSize = 4;
            tempSettings.eol = { eolDel: "\r\n" };
            const { eol, tabSize, ...formatterSettings } = tempSettings;

            const formattedCode = await this._parserHelper.format(
                new FileIdentifier("preview.p", 1),
                sampleCode,
                {
                    settings: formatterSettings,
                    eol: eol,
                    tabSize: tabSize,
                }
            );

            this._panel.webview.postMessage({
                type: "previewUpdated",
                original: sampleCode,
                formatted: formattedCode,
                expandedCategories: expanded
            });
        } catch (error) {
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
        const categories = this.getAllCategories(settings);
        const categoryMap = this.getCategorySampleMap();
        let expandedCategories = Array.from(this._expandedCategories);
        if (expandedCategories.length === 0 && categories.length > 0) {
            expandedCategories = [categories[0]];
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ABL Formatter Preview</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            height: 100%;
            width: 100%;
            overflow: hidden;
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
            height: 100%;
            width: 100%;
        }

        .settings-panel {
            width: 350px;
            min-width: 350px;
            max-width: 350px;
            box-sizing: border-box;
            overflow-y: auto;
            overflow-x: hidden;
            border-right: 1px solid var(--vscode-panel-border);
            padding: 15px;
            background-color: var(--vscode-sideBar-background);
            height: 100%;
            flex-shrink: 0;
        }

        .setting-category {
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }

        .setting-category.collapsed .setting-items {
            display: none;
        }

        .category-toggle {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
            user-select: none;
            gap: 8px;
        }

        .arrow {
            font-size: 11px;
            width: 22px;
            display: inline-block;
            text-align: center;
            font-weight: bold;
            transition: transform 0.1s;
        }

        .setting-items {
            margin-left: 20px;
        }

        .setting-item {
            margin-bottom: 12px;
            padding-left: 8px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        }

        .setting-item label {
            width: 100%;
            max-width: 100%;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 13px;
            box-sizing: border-box;
        }

        .setting-item input[type="checkbox"] {
            cursor: pointer;
        }

        .setting-enum,
        .setting-item select {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            margin-left: 0;
            margin-top: 4px;
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

        .preview-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: 100%;
            padding: 15px;
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

        .section-header {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--vscode-panel-border);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }

        .code-header {
            padding: 8px 12px;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: bold;
            font-size: 14px;
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
            background: var(--vscode-editor-background);
            height: 100%;
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
    </style>
</head>
<body>
    <div class="toolbar">
        <button id="applyBtn">Apply Settings</button>
        <button id="resetBtn">Reset to Defaults</button>
    </div>
    <div class="main-container">
        <div class="settings-panel">
            <div class="section-header">Formatter Settings</div>
            ${categories.map(category => `
                <div class="setting-category${expandedCategories.includes(category) ? "" : " collapsed"}" data-category="${category}">
                    <div class="category-toggle" data-category="${category}">
                        <span class="arrow">${expandedCategories.includes(category) ? "▼" : "▶"}</span>
                        <span>${category}</span>
                    </div>
                    <div class="setting-items">
                        ${this.generateSettingsHtml(settings.filter(s => s.category === category))}
                    </div>
                </div>
            `).join("")}
        </div>
        <div class="preview-panel">
            <div class="section-header">Formatted Code</div>
            <div class="preview-container">
                <div class="code-content" id="formattedCode">
                    ${expandedCategories.length ? "Loading..." : ""}
                </div>
            </div>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        let currentSettings = ${JSON.stringify(this._currentSettings)};
        let expandedCategories = ${JSON.stringify(expandedCategories)};

        document.querySelectorAll('.category-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const cat = toggle.dataset.category;
                const section = document.querySelector('.setting-category[data-category="' + cat + '"]');
                const idx = expandedCategories.indexOf(cat);
                if (section.classList.contains('collapsed')) {
                    section.classList.remove('collapsed');
                    if (idx === -1) expandedCategories.push(cat);
                } else {
                    section.classList.add('collapsed');
                    if (idx !== -1) expandedCategories.splice(idx, 1);
                }
                // Update arrow
                const arrow = toggle.querySelector('.arrow');
                arrow.textContent = section.classList.contains('collapsed') ? "▶" : "▼";
                vscode.postMessage({
                    type: 'categoriesChanged',
                    expandedCategories: expandedCategories
                });
            });
        });

        document.getElementById('applyBtn').addEventListener('click', () => {
            vscode.postMessage({
                type: 'applySettings',
                settings: currentSettings
            });
        });
        document.getElementById('resetBtn').addEventListener('click', () => {
            document.getElementById('formattedCode').textContent = 'Resetting...';
            vscode.postMessage({
                type: 'resetSettings'
            });
        });

        let updateTimeout = null;
        document.querySelectorAll('.setting-checkbox, .setting-enum').forEach(el => {
            el.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                let value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
                if (key) {
                    currentSettings[key] = value;
                    triggerUpdate();
                }
            });
        });
        function triggerUpdate() {
            if (updateTimeout) clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                vscode.postMessage({
                    type: 'settingsChanged',
                    settings: currentSettings,
                    expandedCategories: expandedCategories
                });
            }, 50);
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'previewUpdated':
                    if (expandedCategories.length === 0) {
                        document.getElementById('formattedCode').textContent = "";
                    } else {
                        document.getElementById('formattedCode').textContent = message.formatted;
                    }
                    break;
                case 'previewError':
                    document.getElementById('formattedCode').innerHTML = 
                        '<div class="error-message">Error: ' + message.error + '</div>';
                    break;
                case 'settingsReset':
                    currentSettings = message.settings;

                    for (const [key, value] of Object.entries(message.settings)) {
                        const checkbox = document.querySelector(\`.setting-checkbox[data-key="\${key}"]\`);
                        if (checkbox) checkbox.checked = value;
                        const select = document.querySelector(\`.setting-enum[data-key="\${key}"]\`);
                        if (select) select.value = value;
                    }
                    break;
            }
        });

        vscode.postMessage({
            type: 'categoriesChanged',
            expandedCategories: expandedCategories
        });
    </script>
</body>
</html>`;
    }

    private generateSettingsHtml(settings: FormatterSetting[]): string {
        let html = "";
        for (const setting of settings) {
            html += `<div class="setting-item">`;

            if (setting.type === "boolean") {
                const checked = this._currentSettings[setting.key] ? "checked" : "";
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
                        ${setting.enum!.map(
                            (opt) =>
                                `<option value="${opt}" ${
                                    this._currentSettings[setting.key] === opt
                                        ? "selected"
                                        : ""
                                }>${opt}</option>`
                        ).join("")}
                    </select>
                `;
            }

            if (setting.description) {
                html += `<div class="setting-description">${setting.description}</div>`;
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
