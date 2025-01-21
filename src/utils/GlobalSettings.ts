import { ASettings } from "./ASettings";

export class GlobalSettings extends ASettings {
    public formatOnSave() {
        return this.configurationManager.get("formatOnSave") === true;
    }
}
