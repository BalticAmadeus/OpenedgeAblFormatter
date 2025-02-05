import { ASettings } from "../ASettings";

export class IfFunctionSettings extends ASettings {
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
