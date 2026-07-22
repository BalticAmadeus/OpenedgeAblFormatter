import { ParseResult } from "../../model/ParseResult";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeBlock, IStrategy } from "./IStrategy";
import { RangeHelper } from "./RangeHelper";
import { StrategyParseBase } from "./StrategyParseBase";
import { AblParserHelper } from "../../parser/AblParserHelper";
import type Parser from "web-tree-sitter";

export class MethodStrategy extends StrategyParseBase implements IStrategy {
    name = "MethodStrategy";

    constructor(parserHelper: AblParserHelper) {
        super(parserHelper);
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        const resolvedParseResult = this.ensureParseResult(input, parseResult);
        if (!resolvedParseResult) {return [];}
        const ranges: CodeBlock[] = [];
        const methodNode = resolvedParseResult.tree.rootNode.children[0];
        if (methodNode) {
            this.addMethodRanges(methodNode, ranges, input);
        }
        return ranges;
    }

    private addMethodRanges(node: Parser.SyntaxNode, ranges: CodeBlock[], input: string): void {
        const parametersNode = node.children.find(
            (child) => child.type === SyntaxNodeType.Parameters
        );
        const bodyNode = node.children.find(
            (child) => child.type === SyntaxNodeType.Body
        );

        if (bodyNode) {
            const { start: bodyStart, end: bodyEnd } = RangeHelper.getBodyBounds(bodyNode);

            this.pushRange(ranges, bodyStart, bodyEnd);

            const { definitionText, parametersText } = RangeHelper.buildDefinitionTextsWithParameters(
                node,
                bodyStart,
                bodyEnd,
                parametersNode
            );

            if (definitionText.trim().length > 0) {
                this.pushSyntheticRange(ranges, definitionText);
            }

            if (parametersText && parametersText.trim().length > 0) {
                this.pushSyntheticRange(ranges, parametersText);
            }
        } else if (node.endIndex > node.startIndex) {
            this.pushRange(ranges, node.startIndex, node.endIndex);
        }
    }

    private pushRange(ranges: CodeBlock[], start: number, end: number): void {
        if (end > start) {
            ranges.push({ start, end });
        }
    }

    private pushSyntheticRange(ranges: CodeBlock[], text: string): void {
        ranges.push({ start: 0, end: 0, text });
    }
}
