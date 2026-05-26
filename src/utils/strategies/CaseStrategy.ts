import { ParseResult } from "../../model/ParseResult";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { CodeBlock, IStrategy } from "./IStrategy";
import { StrategyParseBase } from "./StrategyParseBase";
import { AblParserHelper } from "../../parser/AblParserHelper";
import type Parser from "web-tree-sitter";

export class CaseStrategy extends StrategyParseBase implements IStrategy {
    name = "CaseStrategy";

    constructor(parserHelper: AblParserHelper) {
        super(parserHelper);
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        const resolvedParseResult = this.ensureParseResult(input, parseResult);
        if (!resolvedParseResult) return [];

        const caseNode = resolvedParseResult.tree.rootNode.children[0];
        if (!caseNode || caseNode.type !== SyntaxNodeType.CaseStatement) {
            return [];
        }

        return this.addCaseRanges(caseNode, input);
    }

    private addCaseRanges(caseNode: Parser.SyntaxNode, input: string): CodeBlock[] {
        const bodyNode = caseNode.children.find(
            (child) => child.type === SyntaxNodeType.CaseBody || child.type === SyntaxNodeType.Body
        );

        if (!bodyNode) {
            return caseNode.endIndex > caseNode.startIndex
                ? [{ start: caseNode.startIndex, end: caseNode.endIndex }]
                : [];
        }

        const whenBranches = bodyNode.children.filter(
            (child) => child.type === SyntaxNodeType.CaseWhenBranch
        );
        const otherwiseBranch = bodyNode.children.find(
            (child) => child.type === SyntaxNodeType.CaseOtherwiseBranch
        );

        if (whenBranches.length === 0) {
            return caseNode.endIndex > caseNode.startIndex
                ? [{ start: caseNode.startIndex, end: caseNode.endIndex }]
                : [];
        }

        const header = input.substring(caseNode.startIndex, whenBranches[0].startIndex);
        const trailerStart = otherwiseBranch
            ? otherwiseBranch.endIndex
            : whenBranches[whenBranches.length - 1].endIndex;
        const trailer = input.substring(trailerStart, caseNode.endIndex);

        const blocks: CodeBlock[] = [];
        const lastWhenIndex = whenBranches.length - 1;

        for (let index = 0; index < whenBranches.length; index++) {
            const whenBranch = whenBranches[index];
            const includeOtherwise = Boolean(otherwiseBranch) && index === lastWhenIndex;
            const whenText = input.substring(whenBranch.startIndex, whenBranch.endIndex);
            const otherwiseText = includeOtherwise && otherwiseBranch
                ? input.substring(otherwiseBranch.startIndex, otherwiseBranch.endIndex)
                : "";
            const snippet = header + whenText + otherwiseText + trailer;

            if (snippet.trim().length > 0) {
                blocks.push({ start: 0, end: 0, text: snippet });
            }
        }

        return blocks;
    }
}