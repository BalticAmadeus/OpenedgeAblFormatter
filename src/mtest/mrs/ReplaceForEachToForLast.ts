import { TextTree } from "../OriginalTestCase";
import { MR } from "../MR";

export class ReplaceForEachToForLast implements MR {
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
