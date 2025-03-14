import Parser from "tree-sitter";

export interface ParseResult {
    tree: Parser.Tree;
    ranges: Parser.Range[];
}
