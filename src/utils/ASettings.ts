import { IConfigurationManager } from "./IConfigurationManager";

export abstract class ASettings {
    public constructor(
        protected readonly configurationManager: IConfigurationManager
    ) {}
}
