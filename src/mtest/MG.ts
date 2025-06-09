import { Tree } from "web-tree-sitter";
import { MR } from "./MR";
import { EOL } from "../model/EOL";

export interface OriginalTestCase<T> {
    name: string;
    eol: EOL;
    input: T;
    output: T;
}

export type TextTree = { text: string; tree: Tree };

export class MG<T extends TextTree> {
    public inputAndOutputPairs: OriginalTestCase<T>[] = [];
    public mr: MR<T>;

    public constructor(inputAndOutputPairs: OriginalTestCase<T>[], mr: MR<T>) {
        this.inputAndOutputPairs = inputAndOutputPairs;
        this.mr = mr;
    }
}

export interface MetamorphicGroup {
    inputAndOutputPairs: OriginalTestCase<TextTree>[];
    mr: MR<TextTree>;
}
