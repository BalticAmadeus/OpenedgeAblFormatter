import { ASettings } from "../ASettings";

export class VariableDefinitionSettings extends ASettings {
    // variable definition settings
    public variableDefinitionFormatting() {
        return !!this.configurationManager.get("variableDefinitionFormatting");
    }
}
