import { ASettings } from "../ASettings";

export class CaseSettings extends ASettings {
    // case settings
    public caseFormatting() {
        return !!this.configurationManager.get("caseFormatting");
    }

    public newLineBeforeThen() {
        return (
            this.configurationManager.get("caseFormattingThenLocation") ===
            "New"
        );
    }

    public newLineBeforeDo() {
        return (
            this.configurationManager.get("caseFormattingDoLocation") === "New"
        );
    }

    public newLineBeforeStatement() {
        return (
            this.configurationManager.get("caseFormattingStatementLocation") ===
            "New"
        );
    }
}
