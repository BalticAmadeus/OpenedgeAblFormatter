import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeBlock, IStrategy } from "./IStrategy";
import { ParseResult } from "../../model/ParseResult";
import { RangeHelper } from "./RangeHelper";
import { StrategyParseBase } from "./StrategyParseBase";
import { AblParserHelper } from "../../parser/AblParserHelper";
import type Parser from "web-tree-sitter";

export class ProcedureStrategy extends StrategyParseBase implements IStrategy {
    name = "ProcedureStrategy";

    constructor(parserHelper: AblParserHelper) {
        super(parserHelper);
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        const resolvedParseResult = this.ensureParseResult(input, parseResult);
        if (!resolvedParseResult) return [];

        const ranges: CodeBlock[] = [];
        const procedureNode = resolvedParseResult.tree.rootNode.children[0];
        if (procedureNode) {
            this.addProcedureRanges(procedureNode, ranges, input);
        }

        return ranges;
    }

    private addProcedureRanges(node: Parser.SyntaxNode, ranges: CodeBlock[], input: string): void {
        const bodyNode = node.children.find(
            (child) => child.type === SyntaxNodeType.Body
        );

        if (bodyNode) {
            const { start: bodyStart, end: bodyEnd } = RangeHelper.getBodyBounds(bodyNode);

            if (bodyEnd > bodyStart) {
                ranges.push({ start: bodyStart, end: bodyEnd });
            }

            const procedureDefinitionText = RangeHelper.buildDefinitionText(input, node, bodyStart, bodyEnd);
            if (procedureDefinitionText.trim().length > 0) {
                ranges.push({ start: node.startIndex, end: node.startIndex, text: procedureDefinitionText });
            }
        } else if (node.endIndex > node.startIndex) {
            ranges.push({ start: node.startIndex, end: node.endIndex });
        }
    }
}