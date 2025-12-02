import { TextTree } from "./OriginalTestCase";

export interface MR {
    mrName: string;

    inputFunction(input: TextTree): string | Promise<string>;
    outputFunction(output: TextTree): string | Promise<string>;

    checkIfApplicable(input: TextTree): boolean;
}
