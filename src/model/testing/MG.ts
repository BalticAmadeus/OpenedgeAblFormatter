import { Tree } from "web-tree-sitter";
import { MR } from "./MR";

export interface OriginalTestCase<T> {
    name: string;
    input: T;
    output: T;
}

export type TextTree = { text: string; tree: Tree };
export type InputOutputType = string | TextTree;

export class MG<T extends InputOutputType> {
    public inputAndOutputPairs: OriginalTestCase<T>[] = [];
    public mr: MR<T>;

    public constructor(inputAndOutputPairs: OriginalTestCase<T>[], mr: MR<T>) {
        this.inputAndOutputPairs = inputAndOutputPairs;
        this.mr = mr;
    }
}
