import { AFormatterSettings } from "../AFormatterSettings";

export class TempTableSettings extends AFormatterSettings {
    // temptable settings
    public temptableFormatting() {
        return !!this.configurationManager.get("temptableFormatting");
    }
}
