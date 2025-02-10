import { ASettings } from "../ASettings";

export class BlockSettings extends ASettings {
    //block settings
    public blockFormatting() {
        return !!this.configurationManager.get("blockFormatting");
    }
}
