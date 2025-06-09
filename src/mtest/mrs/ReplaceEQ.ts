import { TextTree } from "../MG";
import { MR } from "../MR";

export class ReplaceEQ implements MR<TextTree> {
    mrName: string = "ReplaceEQ";

    inputFunction(input: TextTree): string {
        return input.text.replace(" eq ", " = ");
    }

    outputFunction(output: TextTree): string {
        return this.inputFunction(output);
    }

    checkIfApplicable(input: TextTree): boolean {
        return true;
    }
}
