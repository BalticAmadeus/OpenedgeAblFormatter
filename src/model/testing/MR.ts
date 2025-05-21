import { InputOutputType } from "./MG";

export interface MR<T extends InputOutputType> {
    mrName: string;

    inputFunction(input: T): string;
    outputFunction(output: T): string;

    checkIfApplicable(input: T): boolean;
}
