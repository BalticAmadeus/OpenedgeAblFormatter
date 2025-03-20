import { Node } from "web-tree-sitter";
import { CodeEdit } from "../model/CodeEdit";
import { FullText } from "../model/FullText";

export interface IFormatter {
    match(node: Readonly<Node>): boolean;
    parse(
        node: Readonly<Node>,
        fullText: Readonly<FullText>
    ): CodeEdit | CodeEdit[] | undefined;
}
