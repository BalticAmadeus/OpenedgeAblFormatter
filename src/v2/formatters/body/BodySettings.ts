import { AFormatterSettings } from "../AFormatterSettings";

export class BodySettings extends AFormatterSettings {
    //empty block settings
    public BodyFormatting() {
        return !!this.configurationManager.get("bodyFormatting");
    }
}
