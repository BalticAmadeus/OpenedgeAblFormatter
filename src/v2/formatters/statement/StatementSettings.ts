import { ASettings } from "../ASettings";

export class StatementSettings extends ASettings {
    // property settings
    public statementFormatting() {
        return !!this.configurationManager.get("statementFormatting");
    }
}
