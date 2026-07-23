import { ASettings } from "../ASettings";

export class FormSettings extends ASettings {
    public startOnNewLine(): boolean {
        return (
            this.configurationManager.get("formFormattingStartOnNewLine") ===
            "Yes"
        );
    }

    public endDotOnNewLine(): boolean {
        return (
            this.configurationManager.get("formFormattingEndDotLocation") ===
            "New"
        );
    }
}
