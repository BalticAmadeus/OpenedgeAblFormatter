import { MR } from "./MR";

export class ReplaceEQsMR implements MR<string> {
    mrName: string = "ReplaceEQsMR";

    inputFunction(input: string): string {
        return input.replace("eq", "=");
    }

    outputFunction(output: string): string {
        return this.inputFunction(output);
    }

    checkIfApplicable(input: string): boolean {
        return true;
    }
}
