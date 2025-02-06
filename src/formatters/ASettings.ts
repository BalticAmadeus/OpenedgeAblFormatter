import { IConfigurationManager } from "../utils/IConfigurationManager";

export abstract class ASettings {
    public constructor(
        protected readonly configurationManager: IConfigurationManager
    ) {}

    public tabSize() {
        return this.configurationManager.getTabSize();
    }

    public casing() {
        return this.configurationManager.getCasing();
    }
}
