import { InputOutputType } from "./MG";

export interface MR<T extends InputOutputType> {
    mrName: string;

    inputFunction(sourceInput: T): string;
    outputFunction(folowUpInput: T): string;

    checkIfApplicable(sourceInput: T): boolean;
}
