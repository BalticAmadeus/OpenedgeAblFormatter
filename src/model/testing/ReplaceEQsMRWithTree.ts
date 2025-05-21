import { TextTree } from "./MG";
import { MR } from "./MR";

export class ReplaceEQsMRWithTree implements MR<TextTree> {
    mrName: string = "ReplaceEQsMR";

    inputFunction(input: TextTree): string {
        return input.text.replace("eq", "=");
    }

    outputFunction(output: TextTree): string {
        return this.inputFunction(output);
    }

    checkIfApplicable(input: TextTree): boolean {
        return true;
    }
}
