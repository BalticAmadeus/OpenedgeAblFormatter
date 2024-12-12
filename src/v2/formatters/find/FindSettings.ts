import { AFormatterSettings } from "../AFormatterSettings";

export class FindSettings extends AFormatterSettings {
    // token settings
    public findFormatting() {
        return this.configurationManager.get("findFormatting") ? true : false;
    }
}
