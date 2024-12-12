import { AFormatterSettings } from "../AFormatterSettings";

export class EnumSettings extends AFormatterSettings {
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
