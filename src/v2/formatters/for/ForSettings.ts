import { AFormatterSettings } from "../AFormatterSettings";

export class ForSettings extends AFormatterSettings {
    // token settings
    public forFormatting() {
        return this.configurationManager.get("forFormatting") ? true : false;
    }
}
