import { ASettings } from "../ASettings";

export class EnumSettings extends ASettings {
    // token settings
    public enumFormatting() {
        return this.configurationManager.get("enumFormatting") ? true : false;
    }

    public endDotNewLine() {
        return (
            this.configurationManager.get("assignFormattingEndDotLocation") ===
            "New"
        );
    }
}
