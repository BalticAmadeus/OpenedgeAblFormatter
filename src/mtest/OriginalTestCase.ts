import { Tree } from "web-tree-sitter";
import { EOL } from "../model/EOL";

export interface OriginalTestCase {
    name: string;
    eol: EOL;
    input: TextTree;
    output: TextTree;
}

export type TextTree = { text: string; tree: Tree };
