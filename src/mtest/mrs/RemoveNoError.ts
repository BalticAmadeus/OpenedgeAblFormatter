import { TextTree } from "../MG";
import { MR } from "../MR";

export class RemoveNoError implements MR<TextTree> {
    mrName: string = "RemoveNoError";

    inputFunction(input: TextTree): string {
        return input.text.replace(/\s*no-error\s*/g, "");
    }

    outputFunction(output: TextTree): string {
        return this.inputFunction(output);
    }

    checkIfApplicable(input: TextTree): boolean {
        return true;
    }
}
