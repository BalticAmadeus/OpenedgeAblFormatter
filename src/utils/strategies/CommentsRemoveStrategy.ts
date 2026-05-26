import { IStrategy, CodeBlock } from "./IStrategy";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { ParseResult } from "../../model/ParseResult";
import { StrategyParseBase } from "./StrategyParseBase";
import { AblParserHelper } from "../../parser/AblParserHelper";
import type Parser from "web-tree-sitter";

export class CommentsRemoveStrategy extends StrategyParseBase implements IStrategy {
    constructor(parserHelper: AblParserHelper) {
        super(parserHelper);
    }

    applicable(input: string, parseResult?: ParseResult): boolean {
        // Quick  check before expensive parsing
        if (!input.includes("/*") && !input.includes("//")) {
            return false;
        }

        // Deep check: parsing
        const resolvedParseResult = this.ensureParseResult(input, parseResult);
        if (!resolvedParseResult) return false;

        let hasComment = false;

        function checkCommentNode(node: Parser.SyntaxNode) {
            if (hasComment) return;

            if (node.type === SyntaxNodeType.Comment) {
                hasComment = true;
                return;
            }

            for (const child of node.children) {
                checkCommentNode(child);
                if (hasComment) return;
            }
        }

        checkCommentNode(resolvedParseResult.tree.rootNode);
        return hasComment;
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        const resolvedParseResult = this.ensureParseResult(input, parseResult);
        if (!resolvedParseResult) return [];

        const commentRanges: CodeBlock[] = [];

        function collectCommentNodes(node: Parser.SyntaxNode) {
            if (node.type === SyntaxNodeType.Comment) {
                commentRanges.push({ start: node.startIndex, end: node.endIndex });
                return;
            }
            for (const child of node.children) {
                collectCommentNodes(child);
            }
        }

        collectCommentNodes(resolvedParseResult.tree.rootNode);

        if (commentRanges.length === 0) {
            return [];
        }

        // Sort just in case, though tree traversal naturally tends to be ordered
        commentRanges.sort((a, b) => a.start - b.start);

        const adjustedRanges: CodeBlock[] = [];

        for (const range of commentRanges) {
            let start = range.start;
            let end = range.end;

            let walkBack = start - 1;
            while (walkBack >= 0 && (input[walkBack] === ' ' || input[walkBack] === '\t')) {
                walkBack--;
            }
            const isStartOfLine = (walkBack < 0 || input[walkBack] === '\n');

            let walkForward = end;
            while (walkForward < input.length && (input[walkForward] === ' ' || input[walkForward] === '\t')) {
                walkForward++;
            }
            
            const isEndOfLine = (walkForward === input.length || input[walkForward] === '\n' || (input[walkForward] === '\r' && input[walkForward+1] === '\n'));
            
            if (isStartOfLine && isEndOfLine) {
                start = walkBack + 1;
                if (input[walkForward] === '\r' && input[walkForward+1] === '\n') {
                    end = walkForward + 2;
                } else if (input[walkForward] === '\n') {
                    end = walkForward + 1;
                } else {
                    end = walkForward;
                }
            } else if (isEndOfLine) {
                start = walkBack + 1;
            } else if (isStartOfLine) {
                end = walkForward;
            }
            adjustedRanges.push({ start, end });
        }

        return adjustedRanges;
    }
}
