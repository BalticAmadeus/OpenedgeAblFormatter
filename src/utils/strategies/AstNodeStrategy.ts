import { IStrategy, CodeBlock } from "./IStrategy";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import { ParseResult } from "../../model/ParseResult";
import type Parser from "web-tree-sitter";

export class AstNodeStrategy implements IStrategy {
    constructor(
        public name: string,
        private parserHelper: AblParserHelper,
        private targetNodeType: SyntaxNodeType,
        private keywordHint?: string
    ) {}

    applicable(input: string, parseResult?: ParseResult): boolean {
        if (this.keywordHint && !input.toLowerCase().includes(this.keywordHint)) return false;
        if (!parseResult) parseResult = this.parserHelper.parse(new FileIdentifier("temp.p", 1), input);
        
        let hasNode = false;
        const targetType = this.targetNodeType;
        
        function checkNode(node: Parser.SyntaxNode) {
            if (hasNode) return;
            if (node.type === targetType) { hasNode = true; return; }
            for (const child of node.children) { 
                checkNode(child); 
                if (hasNode) return; 
            }
        }
        
        checkNode(parseResult.tree.rootNode);
        return hasNode;
    }

    generate(input: string, parseResult?: ParseResult): CodeBlock[] {
        if (!parseResult) parseResult = this.parserHelper.parse(new FileIdentifier("temp.p", 1), input);
        
        const ranges: CodeBlock[] = [];
        const targetType = this.targetNodeType;
        
        function collectNodes(node: Parser.SyntaxNode) {
            if (node.type === targetType) { 
                ranges.push({start: node.startIndex, end: node.endIndex}); 
            }
            for (const child of node.children) { 
                collectNodes(child); 
            }
        }
        
        collectNodes(parseResult.tree.rootNode);
        return ranges;
    }
}