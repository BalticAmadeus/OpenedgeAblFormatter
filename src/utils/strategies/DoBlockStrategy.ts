import { ParseResult } from "../../model/ParseResult";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeBlock, IStrategy } from "./IStrategy";
import { RangeHelper } from "./RangeHelper";
import { StrategyParseBase } from "./StrategyParseBase";
import { AblParserHelper } from "../../parser/AblParserHelper";
import type Parser from "web-tree-sitter";

export class DoBlockStrategy extends StrategyParseBase implements IStrategy {
    name = "DoBlockStrategy";

    constructor(parserHelper: AblParserHelper) {
        super(parserHelper);
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        const resolvedParseResult = this.ensureParseResult(input, parseResult);
        if (!resolvedParseResult) return [];

        const ranges: CodeBlock[] = [];
        this.collectDoBlockRanges(resolvedParseResult.tree.rootNode, ranges, input);
        return ranges;
    }

    private collectDoBlockRanges(node: Parser.SyntaxNode, ranges: CodeBlock[], input: string): void {
        if (node.type === SyntaxNodeType.DoBlock) {
            this.addDoBlockRanges(node, ranges, input);
            return;
        }

        for (const child of node.children) {
            this.collectDoBlockRanges(child, ranges, input);
        }
    }

    private addDoBlockRanges(node: Parser.SyntaxNode, ranges: CodeBlock[], input: string): void {
        const bodyNode = node.children.find(
            (child) => child.type === SyntaxNodeType.Body
        );

        if (bodyNode) {
            const { start: bodyStart, end: bodyEnd } = RangeHelper.getBodyBounds(bodyNode);

            if (bodyEnd > bodyStart) {
                ranges.push({ start: bodyStart, end: bodyEnd });
            }

            const doStatementText = RangeHelper.buildDefinitionText(input, node, bodyStart, bodyEnd);
            if (doStatementText.trim().length > 0) {
                ranges.push({ start: node.startIndex, end: node.startIndex, text: doStatementText });
            }
        } else if (node.endIndex > node.startIndex) {
            ranges.push({ start: node.startIndex, end: node.endIndex });
        }
    }
}
