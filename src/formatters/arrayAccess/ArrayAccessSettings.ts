import { ASettings } from "../ASettings";

export class ArrayAccessSettings extends ASettings {
    //empty block settings
    public ArrayAccessFormatting() {
        return !!this.configurationManager.get("arrayAccessFormatting");
    }
    public addSpaceAfterComma() {
        const setting = this.configurationManager.get(
            "arrayAccessFormattingAddSpaceAfterComma"
        );
        // Default is true (add space), only false when explicitly set to "No"
        return setting !== "No";
    }
}
