import { ParseResult } from "../../model/ParseResult";
import { CodeBlock, IStrategy } from "./IStrategy";
import { StrategyParseBase } from "./StrategyParseBase";
import { AblParserHelper } from "../../parser/AblParserHelper";

export class RootStrategy extends StrategyParseBase implements IStrategy {
    name = "RootStrategy";

    constructor(parserHelper: AblParserHelper) {
        super(parserHelper);
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        const resolvedParseResult = this.ensureParseResult(input, parseResult);
        if (!resolvedParseResult) {
            return [];
        }

        return resolvedParseResult.tree.rootNode.children.map((child) => ({
            start: child.startIndex,
            end: child.endIndex,
        }));
    }
}
