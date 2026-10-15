import { ASettings } from "../ASettings";

export class ForSettings extends ASettings {
    // token settings
    public forFormatting() {
        return this.configurationManager.get("forFormatting") ? true : false;
    }

    public whereLocation(): "New" | "Same" {
        const value = this.configurationManager.get("forFormattingWhereLocation");
        return value === "New" ? "New" : "Same";
    }
}