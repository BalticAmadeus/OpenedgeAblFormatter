import { TextTree } from "./MG";

export interface MR<T extends TextTree> {
    mrName: string;

    inputFunction(input: T): string;
    outputFunction(output: T): string;

    checkIfApplicable(input: T): boolean;
}
