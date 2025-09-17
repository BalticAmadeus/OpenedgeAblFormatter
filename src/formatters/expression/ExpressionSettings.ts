import { ASettings } from "../ASettings";

export class ExpressionSettings extends ASettings {
    // expression settings
    public expressionSettings() {
        return !!this.configurationManager.get("expressionFormatting");
    }

    public newLineAfterLogical() {
        return (
            this.configurationManager.get(
                "expressionFormattingLogicalLocation"
            ) === "New"
        );
    }

    public newLineBeforeLogical() {
        return (
            this.configurationManager.get(
                "expressionFormattingLogicalLocation"
            ) === "Before"
        );
    }
}
