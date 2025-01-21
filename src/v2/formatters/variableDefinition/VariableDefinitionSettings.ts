import { AFormatterSettings } from "../AFormatterSettings";

export class VariableDefinitionSettings extends AFormatterSettings {
    // variable definition settings
    public variableDefinitionFormatting() {
        return !!this.configurationManager.get("variableDefinitionFormatting");
    }
}
