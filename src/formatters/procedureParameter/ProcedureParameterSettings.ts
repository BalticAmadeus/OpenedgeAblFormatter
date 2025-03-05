import { ASettings } from "../ASettings";

export class ProcedureParameterSettings extends ASettings {
    // procedure parameter settings
    public procedureParameterFormatting() {
        return !!this.configurationManager.get("procedureParamaterFormatting");
    }
}
