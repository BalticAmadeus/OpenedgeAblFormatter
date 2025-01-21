import { AFormatterSettings } from "../AFormatterSettings";

export class AssignSettings extends AFormatterSettings {
    // assign settings
    public assignFormatting() {
        return !!this.configurationManager.get("assignFormatting");
    }

    public newLineAfterAssign() {
        return (
            this.configurationManager.get("assignFormattingAssignLocation") ===
            "New"
        );
    }

    public alignRightExpression() {
        return (
            this.configurationManager.get(
                "assignFormattingAlignRightExpression"
            ) === "Yes"
        );
    }

    public endDotLocationNew() {
        return !!(
            this.configurationManager.get("assignFormattingEndDotLocation") ===
                "New" ||
            this.configurationManager.get("assignFormattingEndDotLocation") ===
                "New aligned"
        );
    }

    public endDotAlignment() {
        return (
            this.configurationManager.get("assignFormattingEndDotLocation") ===
            "New aligned"
        );
    }
}
