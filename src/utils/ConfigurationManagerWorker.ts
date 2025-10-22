import { IConfigurationManager } from "./IConfigurationManager";

/**
 * Minimal, worker-safe configuration manager for use in the parser worker.
 * Does not import or depend on VS Code APIs.
 */
export class WorkerConfigurationManager implements IConfigurationManager {
    private settings: Record<string, any> = {};
    private tabSize: number = 4;
    private casing: any = undefined;
    private overridingSettings: any = {};

    public setAll(settings: Record<string, any>) {
        this.settings = { ...this.settings, ...settings };
        if (typeof settings.tabSize === "number") {
            this.tabSize = settings.tabSize;
        }
        if (settings["abl.completion.upperCase"] !== undefined) {
            this.casing = settings["abl.completion.upperCase"];
        }
        this.overridingSettings = { ...this.overridingSettings, ...settings };
    }

    public get(name: string): any {
        // Check for override with and without 'AblFormatter.' prefix
        if (this.overridingSettings) {
            if (this.overridingSettings[name] !== undefined) {
                return this.overridingSettings[name];
            }
            const ablKey = "AblFormatter." + name;
            if (this.overridingSettings[ablKey] !== undefined) {
                return this.overridingSettings[ablKey];
            }
        }
        // Also check in settings with and without prefix
        if (this.settings[name] !== undefined) {
            return this.settings[name];
        }
        const ablKey = "AblFormatter." + name;
        if (this.settings[ablKey] !== undefined) {
            return this.settings[ablKey];
        }
        return undefined;
    }

    public setTabSize(tabSize: number): void {
        this.tabSize = tabSize;
    }

    public getTabSize(): number {
        return this.tabSize || 4; // Default to 4 if not set
    }

    public getCasing(): any {
        if (this.overridingSettings && this.overridingSettings["abl.completion.upperCase"] !== undefined) {
            return this.overridingSettings["abl.completion.upperCase"];
        }
        return this.settings["abl.completion.upperCase"];
    }

    public setOverridingSettings(settings: any): void {
        for (const [key, value] of Object.entries(settings)) {
            this.overridingSettings[key] = value;
            if (key.startsWith("AblFormatter.")) {
                const unprefixed = key.replace(/^AblFormatter\./, "");
                this.overridingSettings[unprefixed] = value;
            }
        }
    }

    public getAll() {
        return { ...this.settings };
    }
}
