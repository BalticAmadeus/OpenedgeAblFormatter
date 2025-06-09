import { TextTree } from "../MG";
import { MR } from "../MR";

export class ReplaceForEachToForLast implements MR<TextTree> {
    mrName: string = "ReplaceForEachToForLast";

    inputFunction(input: TextTree): string {
        return input.text
            .replace("for each", "for last")
            .replace("for \neach", "for \nlast");
    }

    outputFunction(output: TextTree): string {
        return this.inputFunction(output);
    }

    checkIfApplicable(input: TextTree): boolean {
        return true;
    }
}
