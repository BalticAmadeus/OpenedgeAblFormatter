import { AFormatterSettings } from "../AFormatterSettings";

export class IfFunctionSettings extends AFormatterSettings {
    // if function settings
    public ifFunctionFormatting() {
        return !!this.configurationManager.get("ifFunctionFormatting");
    }

    public addParentheses() {
        return (
            this.configurationManager.get(
                "ifFunctionFormattingAddParentheses"
            ) === "Yes"
        );
    }

    public newLineBeforeElse() {
        return (
            this.configurationManager.get(
                "ifFunctionFormattingElseLocation"
            ) === "New"
        );
    }
}
