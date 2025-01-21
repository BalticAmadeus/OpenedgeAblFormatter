import { commands, window, workspace, WorkspaceConfiguration } from "vscode";
import { IConfigurationManager } from "./IConfigurationManager";
import * as fs from "fs";

export class ConfigurationManager2 implements IConfigurationManager {
    private static instance: ConfigurationManager2;
    private reloadConfig = true;
    private reloadExternalConfig = true;
    private configuration: WorkspaceConfiguration | undefined = undefined;
    private externalConfiguration: WorkspaceConfiguration | undefined =
        undefined;
    private overridingSettings: any;
    private tabSize: number | undefined;

    private shouldUseOnSaveSettings: boolean = false;
    private onSaveConfig: any;

    private constructor() {
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("AblFormatter")) {
                this.reloadConfig = true;
                window.showInformationMessage(
                    "ABL Formatter settings were changed!"
                );
            }

            if (e.affectsConfiguration("abl.completion")) {
                this.reloadExternalConfig = true;
                window.showInformationMessage(
                    "ABL completion settings were changed!"
                );
            }
        });

        this.readOnSaveSettingsFile();
        this.createOnSaveListener();
    }

    private createOnSaveListener() {
        workspace
            .createFileSystemWatcher("**/.ablformatter/settings.json")
            .onDidChange((e) => {
                window.showInformationMessage(
                    "ABL On Save settings were changed!"
                );

                this.readOnSaveSettingsFile();
            });
    }

    private readOnSaveSettingsFile(): void {
        workspace.findFiles("**/.ablformatter/settings.json").then((files) => {
            if (files.length > 0) {
                this.onSaveConfig = JSON.parse(
                    fs.readFileSync(files[0].fsPath, "utf-8")
                );
            }
        });
    }

    public static getInstance(): ConfigurationManager2 {
        if (!ConfigurationManager2.instance) {
            ConfigurationManager2.instance = new ConfigurationManager2();
        }
        return ConfigurationManager2.instance;
    }

    public get(name: string) {
        if (this.reloadConfig) {
            this.reloadConfig = false;
            this.configuration = workspace.getConfiguration("AblFormatter");
        }
        return this.getConfig(name);
    }

    public setTabSize(tabSize: number): void {
        this.tabSize = tabSize;
    }

    public getTabSize(): number {
        return this.tabSize ?? 4; // Default to 4 if not set
    }

    public getCasing() {
        if (this.reloadExternalConfig) {
            this.reloadExternalConfig = false;
            this.externalConfiguration =
                workspace.getConfiguration("abl.completion");
        }
        return this.getCassingConfig();
    }

    public setOverridingSettings(settings: any): void {
        this.overridingSettings = settings;
    }

    private getCassingConfig(): any {
        const config = this.externalConfiguration?.get("upperCase");

        if (config === undefined || (config !== true && config !== false)) {
            window
                .showErrorMessage(
                    `abl.completion.upperCase setting not set or set incorrectly. Update settings file. Current value - ${config}. Expected values - true or false `,
                    "Settings"
                )
                .then((selection) => {
                    if (selection === "Settings") {
                        commands.executeCommand(
                            "workbench.action.openWorkspaceSettingsFile"
                        );
                    }
                });
        }

        if (this.overridingSettings !== undefined) {
            const overridingConfig =
                this.overridingSettings["abl.completion.upperCase"];

            if (overridingConfig !== undefined) {
                window.showInformationMessage("Found overriding settings!");
                return overridingConfig;
            }
        }
        return config;
    }

    private getConfig(name: string): any {
        const config = this.configuration?.get(name);

        if (this.shouldUseOnSaveSettings) {
            if (this.onSaveConfig === undefined) {
                window.showWarningMessage("On save config was not found!");
            } else {
                const config = this.onSaveConfig["AblFormatter." + name];
                if (config === undefined) {
                    return false;
                }
                return config;
            }
        }

        if (this.overridingSettings !== undefined) {
            const overridingConfig =
                this.overridingSettings["AblFormatter." + name];

            if (overridingConfig !== undefined) {
                window.showInformationMessage("Found overriding settings!");
                return overridingConfig;
            }
        }
        return config;
    }

    public useOnSaveSettings(shouldUseOnSaveSettings: boolean): void {
        this.shouldUseOnSaveSettings = shouldUseOnSaveSettings;
    }
}
