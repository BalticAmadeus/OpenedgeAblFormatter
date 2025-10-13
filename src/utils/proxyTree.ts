import Parser from "web-tree-sitter";

export function createTreeProxy(fileId: string, workerTreeData: any): Parser.Tree {
    const nodeMap = new Map<any, Parser.SyntaxNode>();
    const rootNode = createNodeProxyWithSiblings(workerTreeData.rootNode, nodeMap);
    const treeProxy: any = {
        rootNode: rootNode,
        getChangedRanges: (other: Parser.Tree) => [],
        edit: (edit: any) => {
            console.log("[proxyTree] Tree edit requested:", edit);
        },
        walk: () => createSimpleTreeCursor(rootNode),
    };
    return treeProxy as Parser.Tree;
}

function createSimpleNodeProxy(workerNode: any): Parser.SyntaxNode {
    const children =
        workerNode.children?.map((child: any) =>
            createSimpleNodeProxy(child)
        ) || [];
    const nodeProxy: any = {
        id: workerNode.id || null,
        type: workerNode.type,
        text: workerNode.text,
        startPosition: workerNode.startPosition,
        endPosition: workerNode.endPosition,
        startIndex: workerNode.startIndex || 0,
        endIndex: workerNode.endIndex || 0,
        childCount: children.length,
        children: children,
        parent: null,
        hasError: () => workerNode.hasError || false,
        isNamed: () => workerNode.isNamed !== false,
        isMissing: () => workerNode.isMissing || false,
        isError: () => workerNode.type === "ERROR",
        child: (index: number) => {
            return index < children.length ? children[index] : null;
        },
        descendantForPosition: (point: Parser.Point) => {
            const findDescendant = (
                currentNode: Parser.SyntaxNode
            ): Parser.SyntaxNode | null => {
                if (!currentNode.startPosition || !currentNode.endPosition) {
                    return null;
                }
                const start = currentNode.startPosition;
                const end = currentNode.endPosition;
                if (
                    point.row < start.row ||
                    (point.row === start.row && point.column < start.column) ||
                    point.row > end.row ||
                    (point.row === end.row && point.column > end.column)
                ) {
                    return null;
                }
                for (let i = 0; i < currentNode.childCount; i++) {
                    const child = currentNode.child(i);
                    if (child) {
                        const descendant = findDescendant(child);
                        if (descendant) {
                            return descendant;
                        }
                    }
                }
                return currentNode;
            };
            return findDescendant(nodeProxy);
        },
        toString: () =>
            `${workerNode.type}(${workerNode.startPosition?.row || 0}, ${
                workerNode.startPosition?.column || 0
            })`,
    };
    children.forEach((child: any) => {
        child.parent = nodeProxy;
    });
    return nodeProxy as Parser.SyntaxNode;
}

function createNodeProxyWithSiblings(
    workerNode: any,
    nodeMap: Map<any, Parser.SyntaxNode>
): Parser.SyntaxNode {
    const nodeProxy = createSimpleNodeProxy(workerNode);
    buildNodeMap(nodeProxy, workerNode, nodeMap);
    setupAllSiblingRelationships(nodeProxy, workerNode, nodeMap);
    return nodeProxy;
}

function buildNodeMap(
    nodeProxy: Parser.SyntaxNode,
    workerNode: any,
    nodeMap: Map<any, Parser.SyntaxNode>
): void {
    nodeMap.set(workerNode, nodeProxy);
    if (workerNode.children && Array.isArray(workerNode.children)) {
        for (let i = 0; i < workerNode.children.length; i++) {
            const workerChild = workerNode.children[i];
            const proxyChild = nodeProxy.child(i);
            if (workerChild && proxyChild) {
                buildNodeMap(proxyChild, workerChild, nodeMap);
            }
        }
    }
}

function setupAllSiblingRelationships(
    nodeProxy: Parser.SyntaxNode,
    workerNode: any,
    nodeMap: Map<any, Parser.SyntaxNode>
): void {
    setupSiblingRelationships(nodeProxy, workerNode, nodeMap);
    if (workerNode.children && Array.isArray(workerNode.children)) {
        for (let i = 0; i < workerNode.children.length; i++) {
            const workerChild = workerNode.children[i];
            const proxyChild = nodeProxy.child(i);
            if (workerChild && proxyChild) {
                setupAllSiblingRelationships(proxyChild, workerChild, nodeMap);
            }
        }
    }
}

function setupSiblingRelationships(
    nodeProxy: any,
    workerNode: any,
    nodeMap: Map<any, Parser.SyntaxNode>
): void {
    if (workerNode.nextSibling) {
        let nextSiblingProxy = nodeMap.get(workerNode.nextSibling);
        if (!nextSiblingProxy) {
            nextSiblingProxy = createBasicSiblingProxy(workerNode.nextSibling);
        }
        nodeProxy.nextSibling = nextSiblingProxy;
    } else {
        nodeProxy.nextSibling = null;
    }
    if (workerNode.previousSibling) {
        let previousSiblingProxy = nodeMap.get(workerNode.previousSibling);
        if (!previousSiblingProxy) {
            previousSiblingProxy = createBasicSiblingProxy(workerNode.previousSibling);
        }
        nodeProxy.previousSibling = previousSiblingProxy;
    } else {
        nodeProxy.previousSibling = null;
    }
    if (workerNode.nextNamedSibling) {
        let nextNamedSiblingProxy = nodeMap.get(workerNode.nextNamedSibling);
        if (!nextNamedSiblingProxy) {
            nextNamedSiblingProxy = createBasicSiblingProxy(workerNode.nextNamedSibling);
        }
        nodeProxy.nextNamedSibling = nextNamedSiblingProxy;
    } else {
        nodeProxy.nextNamedSibling = null;
    }
    if (workerNode.previousNamedSibling) {
        let previousNamedSiblingProxy = nodeMap.get(workerNode.previousNamedSibling);
        if (!previousNamedSiblingProxy) {
            previousNamedSiblingProxy = createBasicSiblingProxy(workerNode.previousNamedSibling);
        }
        nodeProxy.previousNamedSibling = previousNamedSiblingProxy;
    } else {
        nodeProxy.previousNamedSibling = null;
    }
}

function createBasicSiblingProxy(workerSiblingNode: any): Parser.SyntaxNode {
    const siblingProxy: any = {
        type: workerSiblingNode.type,
        text: workerSiblingNode.text,
        startPosition: workerSiblingNode.startPosition,
        endPosition: workerSiblingNode.endPosition,
        startIndex: workerSiblingNode.startIndex || 0,
        endIndex: workerSiblingNode.endIndex || 0,
        childCount: 0,
        children: [],
        parent: null,
        hasError: () => workerSiblingNode.hasError || false,
        isNamed: () => workerSiblingNode.isNamed !== false,
        isMissing: () => workerSiblingNode.isMissing || false,
        isError: () => workerSiblingNode.type === "ERROR",
        child: () => null,
        toString: () => `${workerSiblingNode.type}(sibling)`,
        nextSibling: null,
        previousSibling: null,
        nextNamedSibling: null,
        previousNamedSibling: null,
    };
    return siblingProxy as Parser.SyntaxNode;
}

function createSimpleTreeCursor(
    rootNode: Parser.SyntaxNode
): Parser.TreeCursor {
    let currentNode = rootNode;
    const cursor: any = {
        currentNode: () => currentNode,
        gotoFirstChild: () => {
            if (currentNode.childCount > 0) {
                const firstChild = currentNode.child(0);
                if (firstChild) {
                    currentNode = firstChild;
                    return true;
                }
            }
            return false;
        },
        gotoNextSibling: () => {
            if (currentNode.parent) {
                const parent = currentNode.parent;
                for (let i = 0; i < parent.childCount - 1; i++) {
                    if (parent.child(i) === currentNode) {
                        const nextSibling = parent.child(i + 1);
                        if (nextSibling) {
                            currentNode = nextSibling;
                            return true;
                        }
                    }
                }
            }
            return false;
        },
        gotoParent: () => {
            if (currentNode.parent) {
                currentNode = currentNode.parent;
                return true;
            }
            return false;
        },
        delete: () => {
            currentNode = rootNode;
        },
    };
    return cursor as Parser.TreeCursor;
}
