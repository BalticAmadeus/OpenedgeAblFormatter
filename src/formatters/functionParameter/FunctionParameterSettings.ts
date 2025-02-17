import { ASettings } from "../ASettings";

export class FunctionParameterSettings extends ASettings {
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
