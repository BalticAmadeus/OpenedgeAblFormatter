import { AFormatterSettings } from "../AFormatterSettings";

export class UsingSettings extends AFormatterSettings {
    // using settings
    public usingFormatting() {
        return !!this.configurationManager.get("usingFormatting");
    }
}
