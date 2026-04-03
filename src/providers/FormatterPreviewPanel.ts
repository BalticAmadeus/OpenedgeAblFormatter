import * as vscode from "vscode";
import { AblParserHelper } from "../parser/AblParserHelper";
import { FormatterPreviewProvider } from "./FormatterPreviewProvider";
import { format } from "../utils/suitesUtils";
import * as path from "node:path";
import * as fs from "node:fs";
import { ConfigurationManager } from "../utils/ConfigurationManager";

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

const SETTINGS_SCOPE_KEY = "openedgeAblFormatter.settingsScope";
const WEBINAR_INFO_URL =
    "https://github.com/BalticAmadeus/OpenedgeAblFormatter/discussions/682";

export class FormatterPreviewPanel {
    public static currentPanel: FormatterPreviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _parserHelper: AblParserHelper;
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _previewProvider: FormatterPreviewProvider;
    private _currentSettings: Record<string, any> = {};
    private _expandedCategories: Set<string> = new Set();
    private _ignoreNextVisibleEditorsEvent = false;
    private _settingsScope: "user" | "workspace" | null = null;

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        parserHelper: AblParserHelper,
        previewProvider: FormatterPreviewProvider
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._parserHelper = parserHelper;
        this._previewProvider = previewProvider;
        
        // Load persisted scope
        const savedScope = globalThis.__ablFormatterExtensionContext?.globalState.get<string>(SETTINGS_SCOPE_KEY);
        if (savedScope === "user" || savedScope === "workspace") {
            this._settingsScope = savedScope;
        }
        
        this._panel.onDidChangeViewState(
            (e) => {
                if (this._panel.visible) {
                    this.updatePreview(Array.from(this._expandedCategories));
                }
            },
            null,
            this._disposables
        );

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
                        this._expandedCategories = new Set(
                            message.expandedCategories
                        );
                        this.updatePreview(message.expandedCategories);
                        break;
                    case "categoriesChanged":
                        this._expandedCategories = new Set(
                            message.expandedCategories
                        );
                        this.updatePreview(message.expandedCategories);
                        break;
                    case "settingChanged":
                        this.handleSettingChange(
                            message.key,
                            message.value,
                            message.category
                        );
                        break;
                    case "applySettings":
                        this.applySettings(message.settings);
                        break;
                    case "resetSettings":
                        this.resetSettings();
                        break;
                    case "scopeChanged":
                        this._settingsScope = message.scope as "user" | "workspace";
                        // Persist the scope selection
                        globalThis.__ablFormatterExtensionContext?.globalState.update(SETTINGS_SCOPE_KEY, this._settingsScope);
                        this._currentSettings = this.getAllFormatterSettings();
                        this._panel.webview.postMessage({
                            type: "settingsReset",
                            settings: this._currentSettings,
                            scopeSelected: true,
                        });
                        this.updatePreview(Array.from(this._expandedCategories));
                        break;
                    case "openWebinarLink":
                        vscode.env.openExternal(vscode.Uri.parse(WEBINAR_INFO_URL));
                        break;
                }
            },
            null,
            this._disposables
        );

        vscode.window.onDidChangeVisibleTextEditors(
            (editors) => {
                if (this._ignoreNextVisibleEditorsEvent) {
                    return;
                }
                setTimeout(() => {
                    const previewVisible = editors.some(
                        (editor) =>
                            editor.document.uri.toString() ===
                            "abl-preview://preview"
                    );
                    if (!previewVisible && FormatterPreviewPanel.currentPanel) {
                        FormatterPreviewPanel.currentPanel.dispose();
                    }
                }, 300); // Slightly longer debounce
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        parserHelper: AblParserHelper,
        previewProvider: FormatterPreviewProvider
    ) {
        const column = vscode.ViewColumn.One;

        if (FormatterPreviewPanel.currentPanel) {
            FormatterPreviewPanel.currentPanel._currentSettings =
                FormatterPreviewPanel.currentPanel.getAllFormatterSettings();
            FormatterPreviewPanel.currentPanel._update();
            FormatterPreviewPanel.currentPanel.updatePreview();
            FormatterPreviewPanel.currentPanel._panel.webview.postMessage({
                type: "settingsReset",
                settings: FormatterPreviewPanel.currentPanel._currentSettings,
            });
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
            parserHelper,
            previewProvider
        );
        FormatterPreviewPanel.currentPanel.openPreviewEditor();
    }

    private async openPreviewEditor() {
        const uri = vscode.Uri.parse("abl-preview://preview");
        this._ignoreNextVisibleEditorsEvent = true;
        await vscode.commands.executeCommand("vscode.open", uri, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: true,
        });

        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.languages.setTextDocumentLanguage(doc, "abl");
        setTimeout(() => {
            this._ignoreNextVisibleEditorsEvent = false;
        }, 500);
    }

    private getAllCategories(settingsMeta: FormatterSetting[]): string[] {
        const categories = new Set<string>();
        for (const s of settingsMeta) {
            categories.add(s.category);
        }
        return Array.from(categories);
    }

    private getAllFormatterSettings(): Record<string, any> {
        const config = vscode.workspace.getConfiguration("AblFormatter");
        const settings: Record<string, any> = {};

        const allSettings = this.getFormatterSettingsMetadata();
        for (const setting of allSettings) {
            if (this._settingsScope === null) {
                // Return defaults when no scope selected
                settings[setting.key] = setting.default;
            } else {
                const inspection = config.inspect(setting.key);
                if (this._settingsScope === "workspace") {
                    settings[setting.key] = inspection?.workspaceValue ?? setting.default;
                } else {
                    settings[setting.key] = inspection?.globalValue ?? setting.default;
                }
            }
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
            if (!fullKey.startsWith("AblFormatter.")) {
                continue;
            }
            if (fullKey === "AblFormatter.showTreeInfoOnHover") {
                continue;
            }

            const key = fullKey.replace("AblFormatter.", "");
            const configAny = config as any;

            // Use category from config if present, otherwise fallback to old logic
            let category: string = configAny.category;

            settings.push({
                key: key,
                label: this.formatLabel(key),
                type: configAny.type === "boolean" ? "boolean" : "enum",
                default: configAny.default,
                enum: configAny.enum,
                description:
                    configAny.description ||
                    configAny.markdownDescription ||
                    "",
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
            .replaceAll(/([A-Z])/g, " $1")
            .replaceAll(/^./g, (str) => str.toUpperCase())
            .trim();
    }

    private async handleSettingChange(
        key: string,
        value: any,
        category?: string
    ) {
        this._currentSettings[key] = value;
        await this.updatePreview(category ? [category] : undefined);
    }

    private getExampleSnippetForCategory(category: string): string {
        // Map category to file name (simple normalization)
        const fileName =
            category
                .toLowerCase()
                .replaceAll(/\s+/g, "-") // spaces to dashes
                .replaceAll(/[^a-z0-9\-]/g, "") + // remove non-alphanum/dash
            ".p";
        const examplePath = path.join(
            this._extensionUri.fsPath,
            "resources",
            "samples",
            "settingsPreview",
            fileName
        );
        if (fs.existsSync(examplePath)) {
            return fs.readFileSync(examplePath, "utf8");
        }
        return "";
    }

    private async updatePreview(expandedCategories?: string[]) {
        try {
            // Build preview code from open categories
            const expanded =
                expandedCategories || Array.from(this._expandedCategories);
            let codeSnippets: string[] = [];
            for (const category of expanded) {
                const snippet = this.getExampleSnippetForCategory(category);
                if (snippet) {
                    codeSnippets.push(snippet);
                }
            }
            const previewCode =
                codeSnippets.join("\n\n") ||
                "// No example code for selected sections.";

            // Prepare settings as before
            const tempSettings: Record<string, any> = {};
            for (const [key, value] of Object.entries(this._currentSettings)) {
                tempSettings[`AblFormatter.${key}`] = value;
            }
            tempSettings.tabSize = 4;
            tempSettings.eol = { eolDel: "\r\n" };
            const { eol, tabSize, ...formatterSettings } = tempSettings;

            // Inject live settings into ConfigurationManager
            const configManager = ConfigurationManager.getInstance();
            configManager.setOverridingSettings(tempSettings);

            const formattedCode = format(
                previewCode,
                "preview.p",
                this._parserHelper,
                false, // isMetamorphicEnabled, adjust if needed
                true // isPreview
            );

            // Update the virtual document for the preview
            this._previewProvider.setContent(formattedCode);

            // (Optional) Still update the webview preview panel if you want
            this._panel.webview.postMessage({
                type: "previewUpdated",
                original: previewCode,
                formatted: formattedCode,
                expandedCategories: expanded,
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
        if (this._settingsScope === null) {
            vscode.window.showWarningMessage("Please select a settings scope first.");
            return;
        }
        const config = vscode.workspace.getConfiguration("AblFormatter");
        const target = this._settingsScope === "workspace"
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
        
        // Get metadata to compare against defaults
        const settingsMetadata = this.getFormatterSettingsMetadata();
        const defaultsMap = new Map<string, any>();
        for (const meta of settingsMetadata) {
            defaultsMap.set(meta.key, meta.default);
        }
        
        try {
            for (const [key, value] of Object.entries(settings)) {
                const defaultValue = defaultsMap.get(key);
                
                // Ensure boolean values are actual booleans, not strings
                let normalizedValue = value;
                if (typeof defaultValue === "boolean") {
                    if (value === "true" || value === true) {
                        normalizedValue = true;
                    } else if (value === "false" || value === false) {
                        normalizedValue = false;
                    }
                }
                
                // Only write if different from default
                if (normalizedValue === defaultValue) {
                    // Remove the setting (revert to default)
                    await config.update(key, undefined, target);
                } else {
                    await config.update(key, normalizedValue, target);
                }
            }
            this._currentSettings = this.getAllFormatterSettings();
            this._panel.webview.postMessage({
                type: "settingsReset",
                settings: this._currentSettings,
            });
            vscode.window.showInformationMessage(
                "Formatter settings applied successfully!"
            );
            await this.updatePreview();
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
        const showPromotionalNotifications = vscode.workspace
            .getConfiguration("AblFormatter")
            .get<boolean>("showPromotionalNotifications", true);
        const settings = this.getFormatterSettingsMetadata();
        const categories = this.getAllCategories(settings);
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

        .scope-bar {
            display: flex;
            gap: 10px;
            padding: 10px 15px;
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            align-items: center;
        }

        .scope-bar select {
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 4px 8px;
            font-size: 13px;
            min-width: 150px;
        }

        .scope-bar select option.hidden-placeholder {
            display: none;
        }

        .toolbar {
            display: flex;
            gap: 10px;
            padding: 10px;
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            align-items: center;
        }

        .webinar-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 10px 15px;
            background-color: var(--vscode-textBlockQuote-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            border-left: 4px solid var(--vscode-charts-orange);
        }

        .webinar-banner.hidden {
            display: none;
        }

        .webinar-banner-title {
            font-weight: 600;
            font-size: 13px;
        }

        .webinar-banner-subtitle {
            margin-top: 2px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }

        .webinar-banner-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }

        .webinar-banner button {
            padding: 5px 10px;
            font-size: 12px;
            cursor: pointer;
            border: 1px solid var(--vscode-button-border);
        }

        .webinar-cta {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .webinar-dismiss {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
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

        .toolbar button:disabled {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-disabledForeground);
            cursor: not-allowed;
            opacity: 0.6;
        }

        .toolbar button:disabled:hover {
            background-color: var(--vscode-button-secondaryBackground);
        }

        .main-container.blurred {
            filter: blur(3px);
            pointer-events: none;
            user-select: none;
            opacity: 0.5;
        }

        .main-container {
            display: flex;
            flex: 1;
            overflow: hidden;
            height: 100%;
            width: 100%;
        }

        .settings-panel {
            width: 100%;
            min-width: 0;
            max-width: none;
            box-sizing: border-box;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 15px;
            background-color: var(--vscode-sideBar-background);
            height: 100%;
            flex-shrink: 1;
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
    ${
        showPromotionalNotifications
            ? `<div id="webinarBanner" class="webinar-banner">
        <div>
            <div class="webinar-banner-title">Upcoming Webinar: OpenEdge ABL Formatter</div>
            <div class="webinar-banner-subtitle">Join our FREE webinar on April 30th for a live demo, setup walkthrough, and Q&A with developer Gustas.</div>
        </div>
        <div class="webinar-banner-actions">
            <button id="webinarCta" class="webinar-cta">Follow Webinar Updates</button>
            <button id="webinarDismiss" class="webinar-dismiss">Dismiss</button>
        </div>
    </div>`
            : ""
    }
    <div class="scope-bar">
        <label for="scopeSelect" style="font-size: 13px; font-weight: bold;">Settings Scope:</label>
        <select id="scopeSelect">
            <option id="scopePlaceholder" value="" disabled${this._settingsScope === null ? " selected" : " class=\"hidden-placeholder\""}>Select Scope</option>
            <option value="user"${this._settingsScope === "user" ? " selected" : ""}>User</option>
            <option value="workspace"${this._settingsScope === "workspace" ? " selected" : ""}>Workspace</option>
        </select>
    </div>
    <div class="toolbar">
        <button id="applyBtn"${this._settingsScope === null ? " disabled" : ""}>Apply Settings</button>
        <button id="resetBtn"${this._settingsScope === null ? " disabled" : ""}>Reset to Defaults</button>
    </div>
    <div class="main-container${this._settingsScope === null ? " blurred" : ""}">
        <div class="settings-panel">
            <div class="section-header">Formatter Settings</div>
            ${categories
                .map(
                    (category) => `
                <div class="setting-category${
                    expandedCategories.includes(category) ? "" : " collapsed"
                }" data-category="${category}">
                    <div class="category-toggle" data-category="${category}">
                        <span class="arrow">${
                            expandedCategories.includes(category) ? "▼" : "▶"
                        }</span>
                        <span>${category}</span>
                    </div>
                    <div class="setting-items">
                        ${this.generateSettingsHtml(
                            settings.filter((s) => s.category === category)
                        )}
                    </div>
                </div>
            `
                )
                .join("")}
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();

        // Restore state if available, otherwise use injected values
        let state = vscode.getState();
        let currentSettings = state?.currentSettings ?? ${JSON.stringify(
            this._currentSettings
        )};
        let originalSettings = state?.originalSettings ?? JSON.parse(JSON.stringify(currentSettings));
        let expandedCategories = state?.expandedCategories ?? ${JSON.stringify(
            expandedCategories
        )};
        let currentScope = state?.currentScope ?? ${this._settingsScope === null ? "null" : `"${this._settingsScope}"`};
        let scopeSelected = currentScope !== null;

        function saveState() {
            vscode.setState({
                currentSettings,
                originalSettings,
                expandedCategories,
                currentScope
            });
        }

        function hasSettingsChanged() {
            for (const key of Object.keys(currentSettings)) {
                if (currentSettings[key] !== originalSettings[key]) {
                    return true;
                }
            }
            return false;
        }

        function updateApplyButton() {
            const applyBtn = document.getElementById('applyBtn');
            if (!scopeSelected) {
                applyBtn.disabled = true;
            } else {
                applyBtn.disabled = !hasSettingsChanged();
            }
        }

        function updateScopeUI() {
            const mainContainer = document.querySelector('.main-container');
            const applyBtn = document.getElementById('applyBtn');
            const resetBtn = document.getElementById('resetBtn');
            const scopeSelect = document.getElementById('scopeSelect');
            const placeholder = document.getElementById('scopePlaceholder');
            
            if (scopeSelected) {
                mainContainer.classList.remove('blurred');
                applyBtn.disabled = !hasSettingsChanged();
                resetBtn.disabled = false;
                // Hide the placeholder option and set the dropdown value
                if (placeholder) {
                    placeholder.classList.add('hidden-placeholder');
                }
                if (scopeSelect && currentScope) {
                    scopeSelect.value = currentScope;
                }
            } else {
                mainContainer.classList.add('blurred');
                applyBtn.disabled = true;
                resetBtn.disabled = true;
                if (placeholder) {
                    placeholder.classList.remove('hidden-placeholder');
                }
            }
        }

        function restoreUI() {
            // Set checkboxes/selects to currentSettings
            for (const [key, value] of Object.entries(currentSettings)) {
                const checkbox = document.querySelector(\`.setting-checkbox[data-key="\${key}"]\`);
                if (checkbox) checkbox.checked = value;
                const select = document.querySelector(\`.setting-enum[data-key="\${key}"]\`);
                if (select) select.value = value;
            }
            // Set expanded/collapsed state for categories
            document.querySelectorAll('.setting-category').forEach(section => {
                const cat = section.dataset.category;
                if (expandedCategories.includes(cat)) {
                    section.classList.remove('collapsed');
                    section.querySelector('.arrow').textContent = "▼";
                } else {
                    section.classList.add('collapsed');
                    section.querySelector('.arrow').textContent = "▶";
                }
            });
        }
        restoreUI();
        updateScopeUI();

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
                saveState();
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
            vscode.postMessage({
                type: 'resetSettings'
            });
        });

        document.getElementById('scopeSelect').addEventListener('change', (e) => {
            currentScope = e.target.value;
            scopeSelected = true;
            updateScopeUI();
            saveState();
            vscode.postMessage({
                type: 'scopeChanged',
                scope: currentScope
            });
        });

        const webinarCta = document.getElementById('webinarCta');
        if (webinarCta) {
            webinarCta.addEventListener('click', () => {
                vscode.postMessage({
                    type: 'openWebinarLink'
                });
            });
        }

        const webinarDismiss = document.getElementById('webinarDismiss');
        if (webinarDismiss) {
            webinarDismiss.addEventListener('click', () => {
                const banner = document.getElementById('webinarBanner');
                if (banner) {
                    banner.classList.add('hidden');
                }
            });
        }

        let updateTimeout = null;
        document.querySelectorAll('.setting-checkbox, .setting-enum').forEach(el => {
            el.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                let value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
                if (key) {
                    currentSettings[key] = value;
                    updateApplyButton();
                    saveState();
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
            if (message.type === 'settingsReset') {
                currentSettings = message.settings;
                originalSettings = JSON.parse(JSON.stringify(message.settings));
                expandedCategories = message.expandedCategories ?? expandedCategories;
                if (message.scopeSelected !== undefined) {
                    scopeSelected = message.scopeSelected;
                    updateScopeUI();
                }
                restoreUI();
                updateApplyButton();
                saveState();
            }
            switch (message.type) {
                case 'settingsReset':
                    currentSettings = message.settings;

                    if (message.expandedCategories) {
                        expandedCategories = message.expandedCategories;
                    }
                    
                    document.querySelectorAll('.setting-category').forEach(section => {
                        const cat = section.dataset.category;
                        if (expandedCategories.includes(cat)) {
                            section.classList.remove('collapsed');
                            section.querySelector('.arrow').textContent = "▼";
                        } else {
                            section.classList.add('collapsed');
                            section.querySelector('.arrow').textContent = "▶";
                        }
                    });

                    for (const [key, value] of Object.entries(message.settings)) {
                        const checkbox = document.querySelector(\`.setting-checkbox[data-key="\${key}"]\`);
                        if (checkbox) checkbox.checked = value;
                        const select = document.querySelector(\`.setting-enum[data-key="\${key}"]\`);
                        if (select) select.value = value;
                    }

                    saveState();
                    vscode.postMessage({
                        type: 'categoriesChanged',
                        expandedCategories: expandedCategories
                    });
                    break;
            }
        });

        // On initial load, notify extension of current expanded categories
        vscode.postMessage({
            type: 'categoriesChanged',
            expandedCategories: expandedCategories
        });
        saveState();
    </script>
</body>
</html>`;
    }

    private generateSettingsHtml(settings: FormatterSetting[]): string {
        let html = "";
        for (const setting of settings) {
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
                                        this._currentSettings[setting.key] ===
                                        opt
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
        return html;
    }

    public dispose() {
        FormatterPreviewPanel.currentPanel = undefined;
        this._panel.dispose();

        setTimeout(() => {
            const previewUri = vscode.Uri.parse("abl-preview://preview");
            const previewEditors = vscode.window.visibleTextEditors.filter(
                (editor) =>
                    editor.document.uri.toString() === previewUri.toString()
            );

            if (previewEditors.length > 0) {
                previewEditors.forEach((editor) => {
                    vscode.window
                        .showTextDocument(
                            editor.document,
                            editor.viewColumn,
                            false
                        )
                        .then(() =>
                            vscode.commands.executeCommand(
                                "workbench.action.closeActiveEditor"
                            )
                        );
                });

                // Optionally, open a new Untitled file to prevent VS Code from re-opening the preview
                if (
                    previewEditors.length ===
                    vscode.window.visibleTextEditors.length
                ) {
                    vscode.commands.executeCommand(
                        "workbench.action.files.newUntitledFile"
                    );
                }
            }
        }, 200);

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
