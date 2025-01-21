import { AFormatterSettings } from "../AFormatterSettings";

export class FunctionParameterSettings extends AFormatterSettings {
    // procedure parameter settings
    public procedureParameterFormatting() {
        return !!this.configurationManager.get("functionParameterFormatting");
    }

    public alignTypes() {
        return (
            this.configurationManager.get(
                "functionParameterFormattingAlignParameterTypes"
            ) === "Yes"
        );
    }
}
