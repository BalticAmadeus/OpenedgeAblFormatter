import { TextTree } from "./MG";
import { MR } from "./MR";

export class ReplaceEQsMRWithTree implements MR<TextTree> {
    mrName: string = "ReplaceEQsMR";

    inputFunction(sourceInput: TextTree): string {
        return sourceInput.text.replace("eq", "=");
    }

    outputFunction(folowUpInput: TextTree): string {
        return this.inputFunction(folowUpInput);
    }

    checkIfApplicable(sourceInput: TextTree): boolean {
        return true;
    }
}
