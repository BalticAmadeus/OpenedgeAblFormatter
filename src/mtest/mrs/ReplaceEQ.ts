import { TextTree } from "../OriginalTestCase";
import { MR } from "../MR";

export class ReplaceEQ implements MR {
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
