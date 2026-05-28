import { ASettings } from "../ASettings";

export class FunctionParameterSettings extends ASettings {
    // procedure parameter settings
    public procedureParameterFormatting() {
        return !!this.configurationManager.get("functionParameterFormatting");
    }

    public separateLineFormatting() {
        return (
            this.configurationManager.get(
                "functionParameterSeparateLineFormatting"
            ) === "Yes"
        );
    }

    public separateLineParenthesisOnNewLine() {
        const mode = this.getParenthesisLocationMode();
        return (
            mode === "Opening new line, closing same line" ||
            mode === "Opening new line, closing new line"
        );
    }

    public separateLineClosingParenthesisOnNewLine() {
        const mode = this.getParenthesisLocationMode();
        return (
            mode === "Opening new line, closing new line" ||
            mode === "Opening same line, closing new line"
        );
    }

    public separateLineParenthesisOnSameLine() {
        return (
            this.getParenthesisLocationMode() ===
            "Opening same line, closing same line"
        );
    }

    private getParenthesisLocationMode(): string {
        const rawValue = this.configurationManager.get(
            "functionParameterSeparateLineParenthesisLocation"
        );

        return rawValue ?? "Opening same line, closing same line";
    }

    public alignTypes() {
        return (
            this.configurationManager.get(
                "functionParameterFormattingAlignParameterTypes"
            ) === "Yes"
        );
    }
}
