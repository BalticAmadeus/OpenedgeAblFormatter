import { ASettings } from "../../utils/ASettings";

export abstract class AFormatterSettings extends ASettings {
    public tabSize() {
        return this.configurationManager.getTabSize();
    }

    public casing() {
        return this.configurationManager.getCasing();
    }
}
