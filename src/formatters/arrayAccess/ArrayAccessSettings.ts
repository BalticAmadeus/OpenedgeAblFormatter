import { ASettings } from "../ASettings";

export class ArrayAccessSettings extends ASettings {
    //empty block settings
    public ArrayAccessFormatting() {
        return !!this.configurationManager.get("arrayAccessFormatting");
    }
    public addSpaceAfterComma() {
        return (
            this.configurationManager.get(
                "arrayAccessFormattingAddSpaceAfterComma"
            ) === "Yes"
        );
    }
}
