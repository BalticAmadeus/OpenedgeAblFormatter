import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeBlock, IStrategy } from "./IStrategy";
import { ParseResult } from "../../model/ParseResult";
import { RangeHelper } from "./RangeHelper";
import { StrategyParseBase } from "./StrategyParseBase";
import { AblParserHelper } from "../../parser/AblParserHelper";
import type Parser from "web-tree-sitter";

export class ClassStrategy extends StrategyParseBase implements IStrategy {
    name = "ClassStrategy";

    constructor(parserHelper: AblParserHelper) {
        super(parserHelper);
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        const resolvedParseResult = this.ensureParseResult(input, parseResult);
        if (!resolvedParseResult) {return [];}

        const ranges: CodeBlock[] = [];
        const classNode = resolvedParseResult.tree.rootNode.children[0];
        if (classNode) {
            this.addClassRanges(classNode, ranges, input);
        }
        return ranges;
    }

    private addClassRanges(node: Parser.SyntaxNode, ranges: CodeBlock[], input: string): void {
        const bodyNode = node.children.find(
            (child) => child.type === SyntaxNodeType.Body
        );

        if (bodyNode) {
            const { start: bodyStart, end: bodyEnd } = RangeHelper.getBodyBounds(bodyNode);

            if (bodyEnd > bodyStart) {
                ranges.push({ start: bodyStart, end: bodyEnd });
            }

            const classDefinitionText = RangeHelper.buildDefinitionText(input, node, bodyStart, bodyEnd);
            if (classDefinitionText.trim().length > 0) {
                ranges.push({ start: node.startIndex, end: node.startIndex, text: classDefinitionText });
            }
        } else if (node.endIndex > node.startIndex) {
            ranges.push({ start: node.startIndex, end: node.endIndex });
        }
    }
}