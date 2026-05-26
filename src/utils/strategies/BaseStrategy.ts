import { IStrategy } from "./IStrategy";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { ParseResult } from "../../model/ParseResult";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { RootStrategy } from "./RootStrategy";
import { ClassStrategy } from "./ClassStrategy";
import { MethodStrategy } from "./MethodStrategy";
import { FunctionStrategy } from "./FunctionStrategy";
import { ProcedureStrategy } from "./ProcedureStrategy";
import { DoBlockStrategy } from "./DoBlockStrategy";
import { IfStrategy } from "./IfStrategy";
import { CaseStrategy } from "./CaseStrategy";

export class BaseStrategy {

    constructor(protected parserHelper: AblParserHelper) {}

    getNextStrategy(input: string, parseResult?: ParseResult): IStrategy | undefined {
        if (!parseResult) {
            parseResult = this.parserHelper.parse(new FileIdentifier("temp.p", 1), input);
        }

        if (!parseResult) return undefined;

        const rootNode = parseResult.tree.rootNode;
        if (rootNode.children.length > 1) {
            return new RootStrategy(this.parserHelper);
        }

        const rootChildType = rootNode.children[0]?.type;

        switch (rootChildType) {
            case SyntaxNodeType.ClassStatement:
                return new ClassStrategy(this.parserHelper);
            case SyntaxNodeType.MethodStatement:
                return new MethodStrategy(this.parserHelper);
            case SyntaxNodeType.ProcedureStatement:
                return new ProcedureStrategy(this.parserHelper);
            case SyntaxNodeType.FunctionStatement:
                return new FunctionStrategy(this.parserHelper);
            case SyntaxNodeType.DoBlock:
                return new DoBlockStrategy(this.parserHelper);
            case SyntaxNodeType.IfStatement:
                return new IfStrategy(this.parserHelper);
            case SyntaxNodeType.CaseStatement:
                return new CaseStrategy(this.parserHelper);
            default:
                return undefined;
        }
    }
}