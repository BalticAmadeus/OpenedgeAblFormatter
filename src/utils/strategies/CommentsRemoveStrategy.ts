import { IStrategy, CodeBlock } from "./IStrategy";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { ParseResult } from "../../model/ParseResult";
import type Parser from "web-tree-sitter";

export class CommentsRemoveStrategy implements IStrategy {
    private parserHelper: AblParserHelper;

    constructor(parserHelper: AblParserHelper) {
        this.parserHelper = parserHelper;
    }

    applicable(input: string, parseResult?: ParseResult): boolean {
        // Quick string check before expensive parsing
        if (!input.includes("/*")) {
            return false;
        }

        // Deep check: parse and ensure there's an actual comment node 
        // (rather than '/*' being inside a string literal)
        if (!parseResult) parseResult = this.parserHelper.parse(new FileIdentifier("temp.p", 1), input);

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

        checkCommentNode(parseResult.tree.rootNode);
        return hasComment;
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        if (!parseResult) parseResult = this.parserHelper.parse(new FileIdentifier("temp.p", 1), input);

        // Collect start and end indices of all comment nodes
        const commentRanges: CodeBlock[] = [];

        function collectCommentNodes(node: Parser.SyntaxNode) {
            if (node.type === SyntaxNodeType.Comment) {
                commentRanges.push({ start: node.startIndex, end: node.endIndex });
                // We do not need to check children of a comment node
                return;
            }
            for (const child of node.children) {
                collectCommentNodes(child);
            }
        }

        collectCommentNodes(parseResult.tree.rootNode);

        if (commentRanges.length === 0) {
            return [];
        }

        // Sort just in case, though tree traversal naturally tends to be ordered
        commentRanges.sort((a, b) => a.start - b.start);

        // Optional: you can keep the logic to calculate expanded start/end if you want to include whitespace.
        // For now, since refactoring asks just for the pairs, let's process the pairs to swallow whitespace
        // as the CommentsRemoveStrategy specifically requires.
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
