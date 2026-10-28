import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { ParseResult } from "../../model/ParseResult";

export class StrategyParseBase {
    constructor(protected parserHelper: AblParserHelper) {}

    protected ensureParseResult(input: string, parseResult?: ParseResult): ParseResult | undefined {
        if (parseResult) {
            return parseResult;
        }

        return this.parserHelper.parse(new FileIdentifier("temp.p", 1), input);
    }
}
