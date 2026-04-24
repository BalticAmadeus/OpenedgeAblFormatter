import { IStrategy } from "./IStrategy";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import type Parser from "web-tree-sitter";

export class MethodStrategy implements IStrategy {
    private parserHelper: AblParserHelper;

    constructor(parserHelper: AblParserHelper) {
        this.parserHelper = parserHelper;
    }

    applicable(input: string): boolean {
        // Quick string check before doing expensive parsing
        if (!input.toLowerCase().includes("method")) {
            return false;
        }

        // Deep check to ensure the keyword "method" is actually part of an AST method_statement node
        const fileIdentifier = new FileIdentifier("temp.p", 1);
        const parseResult = this.parserHelper.parse(fileIdentifier, input);

        let hasMethod = false;

        function checkMethodNode(node: Parser.SyntaxNode) {
            if (hasMethod) return;

            if (node.type === SyntaxNodeType.MethodStatement) {
                hasMethod = true;
                return;
            }

            for (const child of node.children) {
                checkMethodNode(child);
                if (hasMethod) return;
            }
        }

        checkMethodNode(parseResult.tree.rootNode);
        return hasMethod;
    }

    generate(input: string): string[] {
        const fileIdentifier = new FileIdentifier("temp.p", 1);
        const parseResult = this.parserHelper.parse(fileIdentifier, input);

        const positions: number[] = [];
        
        function collectMethodNodes(node: Parser.SyntaxNode) {
            if (node.type === SyntaxNodeType.MethodStatement) {
                positions.push(node.startIndex);
            }
            for (const child of node.children) {
                collectMethodNodes(child);
            }
        }

        collectMethodNodes(parseResult.tree.rootNode);
        positions.sort((a, b) => a - b);

        const candidates: string[] = [];
        let lastPos = 0;

        for (const pos of positions) {
            if (pos > lastPos) {
                const chunk = input.substring(lastPos, pos);
                if (chunk.trim()) {
                    candidates.push(chunk);
                }
                lastPos = pos;
            }
        }

        if (lastPos < input.length) {
            const chunk = input.substring(lastPos);
            if (chunk.trim()) {
                candidates.push(chunk);
            }
        }

        // Only return candidates if we actually split the input into smaller chunks
        if (candidates.length > 1) {
            return candidates;
        }
        return [];
    }
}
