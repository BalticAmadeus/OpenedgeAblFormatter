import { ASettings } from "../ASettings";

export class ArrayAccessSettings extends ASettings {
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
