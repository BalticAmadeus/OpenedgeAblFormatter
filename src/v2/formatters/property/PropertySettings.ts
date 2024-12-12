import { AFormatterSettings } from "../AFormatterSettings";

export class PropertySettings extends AFormatterSettings {
    // property settings
    public propertyFormatting() {
        return !!this.configurationManager.get("propertyFormatting");
    }
}
