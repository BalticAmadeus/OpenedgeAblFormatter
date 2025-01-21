import { AFormatterSettings } from "../AFormatterSettings";

export class BlockSettings extends AFormatterSettings {
    //block settings
    public blockFormatting() {
        return !!this.configurationManager.get("blockFormatting");
    }
}
