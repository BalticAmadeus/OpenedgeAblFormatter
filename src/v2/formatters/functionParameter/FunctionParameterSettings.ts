import { ASettings } from "../ASettings";

export class FunctionParameterSettings extends ASettings {
    // procedure parameter settings
    public procedureParameterFormatting() {
        return !!this.configurationManager.get("functionParamaterFormatting");
    }
}
