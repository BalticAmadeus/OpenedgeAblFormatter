import { AFormatterSettings } from "../AFormatterSettings";

export class ProcedureParameterSettings extends AFormatterSettings {
    // procedure parameter settings
    public procedureParameterFormatting() {
        return !!this.configurationManager.get("procedureParamaterFormatting");
    }
}
