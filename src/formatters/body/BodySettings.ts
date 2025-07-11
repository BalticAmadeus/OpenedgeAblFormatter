import { ASettings } from "../ASettings";

export class BodySettings extends ASettings {
    //empty block settings
    public BodyFormatting() {
        return !!this.configurationManager.get("bodyFormatting");
    }
}
