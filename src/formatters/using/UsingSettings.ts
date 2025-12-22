import { ASettings } from "../ASettings";

export class UsingSettings extends ASettings {
    // using settings
    public usingFormatting() {
        return !!this.configurationManager.get("usingFormatting");
    }

    public usingFormattingFromPropath() {
        return this.configurationManager.get("usingFormattingFromPropath")
    }
}
