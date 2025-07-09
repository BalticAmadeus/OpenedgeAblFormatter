import { TextTree } from "./OriginalTestCase";

export interface MR {
    mrName: string;

    inputFunction(input: TextTree): string;
    outputFunction(output: TextTree): string;

    checkIfApplicable(input: TextTree): boolean;
}
