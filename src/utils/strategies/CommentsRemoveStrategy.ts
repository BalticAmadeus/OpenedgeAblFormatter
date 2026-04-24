import { IStrategy } from "./IStrategy";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import type Parser from "web-tree-sitter";

export class CommentsRemoveStrategy implements IStrategy {
    private parserHelper: AblParserHelper;

    constructor(parserHelper: AblParserHelper) {
        this.parserHelper = parserHelper;
    }

    applicable(input: string): boolean {
        // Quick string check before expensive parsing
        if (!input.includes("/*")) {
            return false;
        }

        // Deep check: parse and ensure there's an actual comment node 
        // (rather than '/*' being inside a string literal)
        const fileIdentifier = new FileIdentifier("temp.p", 1);
        const parseResult = this.parserHelper.parse(fileIdentifier, input);

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

    generate(input: string): string[] {
        const fileIdentifier = new FileIdentifier("temp.p", 1);
        const parseResult = this.parserHelper.parse(fileIdentifier, input);

        // Collect start and end indices of all comment nodes
        const commentRanges: { start: number; end: number }[] = [];

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

        // Build the new string excluding all comment ranges
        let resultString = "";
        let lastPos = 0;

        for (const range of commentRanges) {
            let start = range.start;
            let end = range.end;

            let walkBack = start - 1;
            while (walkBack >= lastPos && (input[walkBack] === ' ' || input[walkBack] === '\t')) {
                walkBack--;
            }
            const isStartOfLine = (walkBack < lastPos || input[walkBack] === '\n');

            let walkForward = end;
            while (walkForward < input.length && (input[walkForward] === ' ' || input[walkForward] === '\t')) {
                walkForward++;
            }
            
            const isEndOfLine = (walkForward === input.length || input[walkForward] === '\n' || (input[walkForward] === '\r' && input[walkForward+1] === '\n'));
            
            if (isStartOfLine && isEndOfLine) {
                // Comment is entirely on its own line: remove the leading spaces and the trailing newline
                start = walkBack + 1;
                if (input[walkForward] === '\r' && input[walkForward+1] === '\n') {
                    end = walkForward + 2;
                } else if (input[walkForward] === '\n') {
                    end = walkForward + 1;
                } else {
                    end = walkForward;
                }
            } else if (isEndOfLine) {
                // Comment is at the end of a line containing code: swallow the spaces before it
                start = walkBack + 1;
            } else if (isStartOfLine) {
                // Comment is at the start of a line containing code: swallow the spaces/tabs after it
                end = walkForward;
            }

            // Append the code before the comment
            resultString += input.substring(lastPos, start);
            lastPos = end;
        }
        
        // Append any remaining code after the last comment
        resultString += input.substring(lastPos);

        // Return as a single candidate
        return [resultString];
    }
}
