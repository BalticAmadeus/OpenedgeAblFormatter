import Parser from "web-tree-sitter";

export interface ParseResult {
    tree: Parser.Tree;
    ranges: Parser.Range[];
}
