import { AblParserHelper } from "../../parser/AblParserHelper";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { BaseCompoundStrategy } from "./BaseCompoundStrategy";
import { AstNodeStrategy } from "./AstNodeStrategy";
import { getSharedStrategies } from "./SharedStrategies";

export class ClassStrategy extends BaseCompoundStrategy {
    constructor(parserHelper: AblParserHelper) {
        super();
        
        // Add Class-specific strategies
        this.subStrategies.push(
            new AstNodeStrategy("ClassStrategy.class", parserHelper, SyntaxNodeType.ClassStatement, "class"),
            new AstNodeStrategy("ClassStrategy.method", parserHelper, SyntaxNodeType.MethodStatement, "method")
        );

        // Add all Shared strategies 
        this.subStrategies.push(...getSharedStrategies(parserHelper));
    }
}