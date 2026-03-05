export interface IConfigurationManager {
    get(name: string): any;
    getTabSize(): any;
    setOverridingSettings(settings: any): void;
}
