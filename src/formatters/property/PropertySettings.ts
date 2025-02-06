import { ASettings } from "../ASettings";

export class PropertySettings extends ASettings {
    // property settings
    public propertyFormatting() {
        return !!this.configurationManager.get("propertyFormatting");
    }
}
