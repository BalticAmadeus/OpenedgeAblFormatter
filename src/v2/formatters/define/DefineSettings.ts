import { AFormatterSettings } from "../AFormatterSettings";

export class DefineSettings extends AFormatterSettings {
    // token settings
    public defineFormatting() {
        return this.configurationManager.get("defineFormatting") ? true : false;
    }
}
