import { ASettings } from "../ASettings";

export class IfSettings extends ASettings {
    // if settings
    public ifFormatting() {
        return !!this.configurationManager.get("ifFormatting");
    }

    public newLineBeforeThen() {
        return (
            this.configurationManager.get("ifFormattingThenLocation") === "New"
        );
    }

    public newLineBeforeDo() {
        return (
            this.configurationManager.get("ifFormattingDoLocation") === "New"
        );
    }

    public newLineBeforeStatement() {
        return (
            this.configurationManager.get("ifFormattingStatementLocation") ===
            "New"
        );
    }
}