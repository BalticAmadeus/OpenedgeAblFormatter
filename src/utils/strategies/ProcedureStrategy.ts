import { IStrategy } from "./IStrategy";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { SyntaxNodeType } from "../../model/SyntaxNodeType";
import type Parser from "web-tree-sitter";

export class ProcedureStrategy implements IStrategy {
    private parserHelper: AblParserHelper;

    constructor(parserHelper: AblParserHelper) {
        this.parserHelper = parserHelper;
    }

    applicable(input: string): boolean {
        // Quick string check before doing expensive parsing
        if (!input.toLowerCase().includes("procedure")) {
            return false;
        }

        // Deep check
        const fileIdentifier = new FileIdentifier("temp.p", 1);
        const parseResult = this.parserHelper.parse(fileIdentifier, input);

        let hasProcedure = false;

        function checkProcedureNode(node: Parser.SyntaxNode) {
            if (hasProcedure) return;

            if (node.type === SyntaxNodeType.ProcedureStatement) {
                hasProcedure = true;
                return;
            }

            for (const child of node.children) {
                checkProcedureNode(child);
                if (hasProcedure) return;
            }
        }

        checkProcedureNode(parseResult.tree.rootNode);
        return hasProcedure;
    }

    generate(input: string): string[] {
        const fileIdentifier = new FileIdentifier("temp.p", 1);
        const parseResult = this.parserHelper.parse(fileIdentifier, input);

        const positions: number[] = [];
        
        function collectProcedureNodes(node: Parser.SyntaxNode) {
            if (node.type === SyntaxNodeType.ProcedureStatement) {
                positions.push(node.startIndex);
            }
            for (const child of node.children) {
                collectProcedureNodes(child);
            }
        }

        collectProcedureNodes(parseResult.tree.rootNode);
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

        if (candidates.length > 1) {
            return candidates;
        }
        return [];
    }
}
