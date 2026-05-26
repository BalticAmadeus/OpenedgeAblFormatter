import { ParseResult } from "../../model/ParseResult";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeBlock, IStrategy } from "./IStrategy";
import { RangeHelper } from "./RangeHelper";
import { StrategyParseBase } from "./StrategyParseBase";
import { AblParserHelper } from "../../parser/AblParserHelper";
import type Parser from "web-tree-sitter";

type BranchRange = {
    start: number;
    end: number;
};

export class IfStrategy extends StrategyParseBase implements IStrategy {
    name = "IfStrategy";

    constructor(parserHelper: AblParserHelper) {
        super(parserHelper);
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        const resolvedParseResult = this.ensureParseResult(input, parseResult);
        if (!resolvedParseResult) return [];

        const ranges: CodeBlock[] = [];
        const ifNode = resolvedParseResult.tree.rootNode.children[0];
        if (ifNode) {
            this.addIfRanges(ifNode, ranges, input);
        }
        return ranges;
    }

    private addIfRanges(node: Parser.SyntaxNode, ranges: CodeBlock[], input: string): void {
        const elseStatements = node.children.filter(
            (child) => child.type === SyntaxNodeType.ElseStatement
        );

        const firstElse = elseStatements[0];
        const thenTextEnd = firstElse ? firstElse.startIndex : node.endIndex;
        const thenText = input.substring(node.startIndex, thenTextEnd);

        if (thenText.trim().length > 0) {
            ranges.push({ start: node.startIndex, end: node.startIndex, text: thenText });
        }

        const thenNode = this.getThenBranchNode(node);
        if (thenNode) {
            const thenRange = this.getBranchBodyRange(thenNode);
            if (thenRange) {
                ranges.push(thenRange);
            }
        }

        for (const elseStatement of elseStatements) {
            const elseBranchNode = this.getElseBranchNode(elseStatement);
            const elseText = this.getElseBranchText(elseStatement, elseBranchNode, input);
            if (elseText.trim().length > 0) {
                ranges.push({ start: elseStatement.startIndex, end: elseStatement.startIndex, text: elseText });
            }

            if (!elseBranchNode) {
                continue;
            }

            const elseRange = this.getBranchBodyRange(elseBranchNode);
            if (elseRange) {
                const elseBodyText = input.substring(elseRange.start, elseRange.end).trim();
                if (elseBodyText.length === 0 || elseBodyText === elseText.trim()) {
                    continue;
                }
                ranges.push(elseRange);
            }
        }

        if (!thenNode && elseStatements.length === 0 && node.endIndex > node.startIndex) {
            ranges.push({ start: node.startIndex, end: node.endIndex });
        }
    }

    private getThenBranchNode(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
        const thenIndex = node.children.findIndex(
            (child) => child.type === SyntaxNodeType.ThenKeyword
        );

        if (thenIndex >= 0) {
            for (let i = thenIndex + 1; i < node.children.length; i++) {
                const child = node.children[i];
                if (child.type === SyntaxNodeType.ElseStatement) {
                    return undefined;
                }
                if (child.isNamed()) {
                    return child;
                }
            }
        }
        return undefined;
    }

    private getElseBranchNode(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
        const thenIndex = node.children.findIndex(
            (child) => child.type === SyntaxNodeType.ThenKeyword
        );

        if (thenIndex >= 0) {
            for (let i = thenIndex + 1; i < node.children.length; i++) {
                const child = node.children[i];
                if (child.isNamed()) {
                    return child;
                }
            }
        }

        const namedChildren = node.children.filter((child) => child.isNamed());
        if (namedChildren.length >= 2) {
            return namedChildren[1];
        }

        return namedChildren[0];
    }

    private getElseBranchText(
        elseNode: Parser.SyntaxNode,
        branchNode: Parser.SyntaxNode | undefined,
        input: string
    ): string {
        const rawText = input.substring(elseNode.startIndex, elseNode.endIndex);
        return rawText.replace(/^\s*else\b\s*/i, "");
    }

    private getBranchBodyRange(node: Parser.SyntaxNode): BranchRange | undefined {
        if (node.type === SyntaxNodeType.DoBlock) {
            const bodyNode = node.children.find(
                (child) => child.type === SyntaxNodeType.Body
            );
            if (!bodyNode) {
                return undefined;
            }
            const { start, end } = RangeHelper.getBodyBounds(bodyNode);
            return end > start ? { start, end } : undefined;
        }

        if (node.type === SyntaxNodeType.Body) {
            const { start, end } = RangeHelper.getBodyBounds(node);
            return end > start ? { start, end } : undefined;
        }

        if (node.endIndex > node.startIndex) {
            return { start: node.startIndex, end: node.endIndex };
        }

        return undefined;
    }
}
