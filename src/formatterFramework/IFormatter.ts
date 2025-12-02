import { SyntaxNode } from "web-tree-sitter";
import { CodeEdit } from "../model/CodeEdit";
import { FullText } from "../model/FullText";

export interface IFormatter {
    match(node: Readonly<SyntaxNode>): boolean;

    compare(node1: Readonly<SyntaxNode>, node2: Readonly<SyntaxNode>): boolean;

    parse(
        node: Readonly<SyntaxNode>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined;
}
