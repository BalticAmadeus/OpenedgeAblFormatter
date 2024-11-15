import { ASettings } from "../ASettings";

export class FindSettings extends ASettings {
    // token settings
    public findFormatting() {
        return this.configurationManager.get("findFormatting") ? true : false;
    }
}
