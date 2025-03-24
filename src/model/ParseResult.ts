import { Tree, Range } from "web-tree-sitter";

export interface ParseResult {
    tree: Tree;
    ranges: Range[];
}
