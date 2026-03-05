import { ASettings } from "../ASettings";

export class ExpressionSettings extends ASettings {
    // expression settings
    public expressionSettings() {
        return !!this.configurationManager.get("expressionFormatting");
    }

    public newLineAfterLogical() {
        const value = this.configurationManager.get(
            "expressionFormattingLogicalLocation"
        );
        return value === "New" || value === "New after";
    }

    public newLineBeforeLogical() {
        const value = this.configurationManager.get(
            "expressionFormattingLogicalLocation"
        );
        return value === "Before" || value === "New before";
    }
}
