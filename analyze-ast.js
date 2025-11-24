"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_tree_sitter_1 = __importDefault(require("web-tree-sitter"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function analyzeAST() {
    // Initialize the parser
    await web_tree_sitter_1.default.init();
    const parser = new web_tree_sitter_1.default();
    // Load the ABL language
    const wasmPath = path.join(__dirname, "resources", "tree-sitter-abl.wasm");
    const AblLanguage = await web_tree_sitter_1.default.Language.load(wasmPath);
    parser.setLanguage(AblLanguage);
    // Read the input file
    const inputFilePath = "c:\\Users\\graginskas\\vsProjects\\OpenedgeAblFormatter\\resources\\functionalTests\\issuesGithub\\420\\input.p";
    const sourceCode = fs.readFileSync(inputFilePath, "utf-8");
    console.log("=".repeat(80));
    console.log("Source Code:");
    console.log("=".repeat(80));
    console.log(sourceCode);
    console.log("\n");
    // Parse the source code
    const tree = parser.parse(sourceCode);
    console.log("=".repeat(80));
    console.log("AST Structure:");
    console.log("=".repeat(80));
    // Function to print node details
    function printNode(node, depth = 0, index = 0) {
        const indent = "  ".repeat(depth);
        const nodeInfo = `${indent}[${index}] ${node.type}`;
        const position = `(${node.startIndex}-${node.endIndex})`;
        const rowCol = `[${node.startPosition.row}:${node.startPosition.column} - ${node.endPosition.row}:${node.endPosition.column}]`;
        console.log(`${nodeInfo} ${position} ${rowCol}`);
        // If it's a leaf node, print its text
        if (node.childCount === 0) {
            console.log(`${indent}  Text: "${node.text}"`);
        }
        // Print all children
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) {
                printNode(child, depth + 1, i);
            }
        }
    }
    // Find the assignment_statement node
    function findAssignmentNode(node) {
        if (node.type === "assign_statement") {
            return node;
        }
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) {
                const found = findAssignmentNode(child);
                if (found)
                    return found;
            }
        }
        return null;
    }
    // Print the full tree
    printNode(tree.rootNode);
    console.log("\n");
    console.log("=".repeat(80));
    console.log("ASSIGNMENT NODE ANALYSIS:");
    console.log("=".repeat(80));
    // Find and analyze the assignment statement
    const assignNode = findAssignmentNode(tree.rootNode);
    if (assignNode) {
        console.log(`\nAssignment Statement Found:`);
        console.log(`  Type: ${assignNode.type}`);
        console.log(`  Start Index: ${assignNode.startIndex}`);
        console.log(`  End Index: ${assignNode.endIndex}`);
        console.log(`  Text Length: ${assignNode.text.length}`);
        console.log(`  Start Position: ${assignNode.startPosition.row}:${assignNode.startPosition.column}`);
        console.log(`  End Position: ${assignNode.endPosition.row}:${assignNode.endPosition.column}`);
        console.log(`  Child Count: ${assignNode.childCount}`);
        console.log(`  Named Child Count: ${assignNode.namedChildCount}`);
        console.log(`\nFull Text:`);
        console.log(`"${assignNode.text}"`);
        console.log(`\nText at end of assignment: "${assignNode.text.slice(-20)}"`);
        console.log(`\nChildren Details:`);
        for (let i = 0; i < assignNode.childCount; i++) {
            const child = assignNode.child(i);
            if (child) {
                console.log(`\n  Child ${i}:`);
                console.log(`    Type: ${child.type}`);
                console.log(`    Start Index: ${child.startIndex}`);
                console.log(`    End Index: ${child.endIndex}`);
                console.log(`    Position: ${child.startPosition.row}:${child.startPosition.column} - ${child.endPosition.row}:${child.endPosition.column}`);
                console.log(`    Text: "${child.text.substring(0, 100)}${child.text.length > 100 ? '...' : ''}"`);
                if (child.text.length > 100) {
                    console.log(`    Full text length: ${child.text.length}`);
                    console.log(`    Text at end: "${child.text.slice(-50)}"`);
                }
            }
        }
        // Find the Assignment child (not assign_statement)
        console.log(`\n${"=".repeat(80)}`);
        console.log(`LOOKING FOR "assignment" NODE (NOT "assign_statement"):`);
        console.log(`${"=".repeat(80)}`);
        function findAssignmentChildren(node, depth = 0) {
            const indent = "  ".repeat(depth);
            if (node.type === "assignment") {
                console.log(`\n${indent}Found "assignment" node:`);
                console.log(`${indent}  Start Index: ${node.startIndex}`);
                console.log(`${indent}  End Index: ${node.endIndex}`);
                console.log(`${indent}  Position: ${node.startPosition.row}:${node.startPosition.column} - ${node.endPosition.row}:${node.endPosition.column}`);
                console.log(`${indent}  Child Count: ${node.childCount}`);
                console.log(`${indent}  Text: "${node.text.substring(0, 150)}${node.text.length > 150 ? '...' : ''}"`);
                console.log(`${indent}  Text at end: "${node.text.slice(-30)}"`);
                console.log(`${indent}  Full text length: ${node.text.length}`);
                console.log(`\n${indent}  Children of "assignment" node:`);
                for (let i = 0; i < node.childCount; i++) {
                    const child = node.child(i);
                    if (child) {
                        console.log(`\n${indent}    Child ${i}:`);
                        console.log(`${indent}      Type: ${child.type}`);
                        console.log(`${indent}      Start Index: ${child.startIndex}`);
                        console.log(`${indent}      End Index: ${child.endIndex}`);
                        console.log(`${indent}      Position: ${child.startPosition.row}:${child.startPosition.column} - ${child.endPosition.row}:${child.endPosition.column}`);
                        console.log(`${indent}      Text: "${child.text.substring(0, 100)}${child.text.length > 100 ? '...' : ''}"`);
                        if (child.text.length > 100) {
                            console.log(`${indent}      Text at end: "${child.text.slice(-30)}"`);
                        }
                    }
                }
            }
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) {
                    findAssignmentChildren(child, depth + 1);
                }
            }
        }
        findAssignmentChildren(assignNode);
    }
    else {
        console.log("No assignment statement found!");
    }
    // Check the source code for "+ 1"
    console.log(`\n${"=".repeat(80)}`);
    console.log(`SOURCE CODE ANALYSIS:`);
    console.log(`${"=".repeat(80)}`);
    const plusOneIndex = sourceCode.indexOf("+ 1");
    if (plusOneIndex !== -1) {
        console.log(`"+ 1" found at index: ${plusOneIndex}`);
        console.log(`Character at that position: "${sourceCode[plusOneIndex]}"`);
        console.log(`Context: "${sourceCode.substring(plusOneIndex - 10, plusOneIndex + 20)}"`);
    }
    tree.delete();
}
analyzeAST().catch(console.error);
//# sourceMappingURL=analyze-ast.js.map