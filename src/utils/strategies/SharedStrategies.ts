import { IStrategy } from "./IStrategy";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { AstNodeStrategy } from "./AstNodeStrategy";

export function getSharedStrategies(parserHelper: AblParserHelper): IStrategy[] {
    return [
        new AstNodeStrategy("Shared.doBlock", parserHelper, SyntaxNodeType.DoBlock, "do"),
        new AstNodeStrategy("Shared.ifStatement", parserHelper, SyntaxNodeType.IfStatement, "if"),
        new AstNodeStrategy("Shared.caseStatement", parserHelper, SyntaxNodeType.CaseStatement, "case"),
        new AstNodeStrategy("Shared.forStatement", parserHelper, SyntaxNodeType.ForStatement, "for"),
        new AstNodeStrategy("Shared.repeatStatement", parserHelper, SyntaxNodeType.RepeatStatement, "repeat"),
        new AstNodeStrategy("Shared.findStatement", parserHelper, SyntaxNodeType.FindStatement, "find"),
        new AstNodeStrategy("Shared.assignStatement", parserHelper, SyntaxNodeType.AssignStatement, "assign"),
        new AstNodeStrategy("Shared.usingStatement", parserHelper, SyntaxNodeType.UsingStatement, "using"),
        new AstNodeStrategy("Shared.catchStatement", parserHelper, SyntaxNodeType.CatchStatement, "catch"),
        new AstNodeStrategy("Shared.finallyStatement", parserHelper, SyntaxNodeType.FinallyStatement, "finally"),

    ];
}