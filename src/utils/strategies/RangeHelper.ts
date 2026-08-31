import type Parser from "web-tree-sitter";

type BodyBounds = {
    start: number;
    end: number;
};

type DefinitionTexts = {
    definitionText: string;
    parametersText?: string;
};

export class RangeHelper {
    static getBodyBounds(bodyNode: Parser.SyntaxNode): BodyBounds {
        const bodyChildren = bodyNode.children;
        const bodyChildrenCount = bodyChildren.length;

        let bodyStart = bodyNode.startIndex;
        let bodyEnd = bodyNode.endIndex;

        if (bodyChildrenCount >= 2) {
            bodyStart = bodyChildren[1].startIndex;
            bodyEnd = bodyChildren[bodyChildrenCount - 1].endIndex;
        } else if (bodyChildrenCount === 1) {
            // Body contains only a separator token ':', so treat as empty body.
            bodyStart = bodyNode.endIndex;
            bodyEnd = bodyNode.endIndex;
        }

        return { start: bodyStart, end: bodyEnd };
    }

    static buildDefinitionText(
        input: string,
        node: Parser.SyntaxNode,
        bodyStart: number,
        bodyEnd: number
    ): string {
        const header = input.substring(node.startIndex, bodyStart);
        const trailer = input.substring(bodyEnd, node.endIndex);
        return header + trailer;
    }

    static buildDefinitionTextsWithParameters(
        node: Parser.SyntaxNode,
        bodyStart: number,
        bodyEnd: number,
        parametersNode?: Parser.SyntaxNode
    ): DefinitionTexts {
        const baseOffset = node.startIndex;
        let header = node.text.substring(0, bodyStart - baseOffset);

        if (parametersNode) {
            const headerEnd = parametersNode.startIndex - baseOffset;
            const betweenParamsAndBody = node.text.substring(
                parametersNode.endIndex - baseOffset,
                bodyStart - baseOffset
            );
            header = node.text.substring(0, headerEnd) + "()" + betweenParamsAndBody;
        }

        const trailer = node.text.substring(bodyEnd - baseOffset);
        const definitionText = header + trailer;

        if (!parametersNode) {
            return { definitionText };
        }

        const parametersHeader = node.text.substring(0, bodyStart - node.startIndex);
        const parametersTrailer = node.text.substring(bodyEnd - node.startIndex);
        const parametersText = parametersHeader + parametersTrailer;

        if (parametersText.trim() === definitionText.trim()) {
            return { definitionText };
        }

        return { definitionText, parametersText };
    }
}
