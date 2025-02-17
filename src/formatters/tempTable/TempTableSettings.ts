import { ASettings } from "../ASettings";

export class TempTableSettings extends ASettings {
    // temptable settings
    public temptableFormatting() {
        return !!this.configurationManager.get("temptableFormatting");
    }
}
