import { MR } from "./MR";

export class ReplaceEQsMR implements MR<string> {
    mrName: string = "ReplaceEQsMR";

    inputFunction(sourceInput: string): string {
        return sourceInput.replace("eq", "=");
    }

    outputFunction(folowUpInput: string): string {
        return this.inputFunction(folowUpInput);
    }

    checkIfApplicable(sourceInput: string): boolean {
        return true;
    }
}
