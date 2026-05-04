import { AblParserHelper } from "../../parser/AblParserHelper";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { BaseCompoundStrategy } from "./BaseCompoundStrategy";
import { AstNodeStrategy } from "./AstNodeStrategy";
import { getSharedStrategies } from "./SharedStrategies";

export class ProcedureStrategy extends BaseCompoundStrategy {
    constructor(parserHelper: AblParserHelper) {
        super();
        
        this.subStrategies.push(
            new AstNodeStrategy("ProcedureStrategy.procedure", parserHelper, SyntaxNodeType.ProcedureStatement, "procedure"),
            new AstNodeStrategy("ProcedureStrategy.function", parserHelper, SyntaxNodeType.FunctionStatement, "function")
        );

        this.subStrategies.push(...getSharedStrategies(parserHelper));
    }
}