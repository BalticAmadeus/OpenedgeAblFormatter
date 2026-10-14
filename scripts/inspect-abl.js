#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const Parser = require("web-tree-sitter");

function printHelp() {
    console.log(`OpenEdge ABL tree-sitter inspector

Usage:
  node scripts/inspect-abl.js "if x = y then do: end."
  node scripts/inspect-abl.js --file resources/samples/ifelse1.p
  node scripts/inspect-abl.js --filter if_statement --json "if x = y then do: end."
  node scripts/inspect-abl.js --against-file good.p --file bug.p

Options:
  --file <path>          Read snippet from a file
  --json                 Print compact JSON
  --filter <type>        Show only nodes matching the given tree-sitter type and their ancestors
  --show-ancestors       Show ancestors for every node in text output
  --against <snippet>    Diff this snippet's tree against the main snippet's tree
  --against-file <path>  Same as --against, reading the snippet from a file
  --help                 Show this help

Notes:
  This uses the same tree-sitter ABL grammar as the formatter, so it reflects the real parse tree
  that the extension sees instead of a guessed AST.

  --against/--against-file implements the "isolate and diff" step from AGENTS.md's decision
  procedure: parse the same construct in two contexts (or a known-good vs. suspicious variant)
  and see exactly where the trees diverge, instead of eyeballing two separate dumps.
`);
}

function parseArgs(argv) {
    const options = {
        json: false,
        filter: null,
        showAncestors: false,
        file: null,
        positional: [],
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === "--help") {
            options.help = true;
            continue;
        }

        if (arg === "--json") {
            options.json = true;
            continue;
        }

        if (arg === "--show-ancestors") {
            options.showAncestors = true;
            continue;
        }

        if (arg === "--filter") {
            const next = argv[i + 1];
            if (!next) {
                throw new Error("Missing value for --filter");
            }
            options.filter = next;
            i += 1;
            continue;
        }

        if (arg === "--file") {
            const next = argv[i + 1];
            if (!next) {
                throw new Error("Missing value for --file");
            }
            options.file = next;
            i += 1;
            continue;
        }

        if (arg === "--against") {
            const next = argv[i + 1];
            if (!next) {
                throw new Error("Missing value for --against");
            }
            options.against = next;
            i += 1;
            continue;
        }

        if (arg === "--against-file") {
            const next = argv[i + 1];
            if (!next) {
                throw new Error("Missing value for --against-file");
            }
            options.againstFile = next;
            i += 1;
            continue;
        }

        options.positional.push(arg);
    }

    return options;
}

function resolveSnippet(options) {
    if (options.file) {
        const fullPath = path.resolve(process.cwd(), options.file);
        return fs.readFileSync(fullPath, "utf8");
    }

    if (options.positional.length > 0) {
        return options.positional.join(" ");
    }

    if (!process.stdin.isTTY) {
        return fs.readFileSync(0, "utf8");
    }

    return null;
}

function resolveAgainstSnippet(options) {
    if (options.againstFile) {
        const fullPath = path.resolve(process.cwd(), options.againstFile);
        return fs.readFileSync(fullPath, "utf8");
    }

    if (options.against !== undefined) {
        return options.against;
    }

    return null;
}

function nodeToJson(node, filter = null) {
    if (!node) {
        return null;
    }

    const json = {
        type: node.type,
        start: node.startPosition,
        end: node.endPosition,
        startIndex: node.startIndex,
        endIndex: node.endIndex,
        childCount: node.childCount,
        children: [],
    };

    // Only leaves carry text: non-leaves would just repeat the full text of every descendant.
    if (node.childCount === 0) {
        json.text = node.text;
    }

    const children = [];
    for (const child of node.children) {
        const childJson = nodeToJson(child, filter);
        if (childJson) {
            children.push(childJson);
        }
    }

    json.children = children;

    if (filter && node.type !== filter) {
        const hasMatchingChild = children.length > 0;
        if (!hasMatchingChild) {
            return null;
        }
    }

    return json;
}

function subtreeMatchesFilter(node, filter) {
    if (node.type === filter) {
        return true;
    }
    return node.children.some((child) => subtreeMatchesFilter(child, filter));
}

// Shared by normal printing and --against diffing, so both see identical formatting.
function collectNodeLines(node, depth, options, lines) {
    if (options.filter && !subtreeMatchesFilter(node, options.filter)) {
        return;
    }

    const indent = "  ".repeat(depth);
    const isMatch = options.filter && node.type === options.filter;

    lines.push(
        `${indent}${isMatch ? "[MATCH] " : ""}${node.type} | ${node.startPosition.row}:${node.startPosition.column} -> ${node.endPosition.row}:${node.endPosition.column}`,
    );

    if (options.showAncestors && node.parent) {
        const ancestors = [];
        let current = node.parent;
        while (current) {
            ancestors.unshift(current.type);
            current = current.parent;
        }
        lines.push(`${indent}  ancestors: ${ancestors.join(" > ")}`);
    }

    if (node.childCount > 0) {
        for (const child of node.children) {
            collectNodeLines(child, depth + 1, options, lines);
        }
    }
}

function printNode(node, depth, options) {
    const lines = [];
    collectNodeLines(node, depth, options, lines);
    lines.forEach((line) => console.log(line));
}

// Classic O(n*m) LCS diff, fine for the tree-sized text this tool prints.
function diffLines(oldLines, newLines) {
    const n = oldLines.length;
    const m = newLines.length;
    const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    for (let i = n - 1; i >= 0; i -= 1) {
        for (let j = m - 1; j >= 0; j -= 1) {
            lcs[i][j] =
                oldLines[i] === newLines[j]
                    ? lcs[i + 1][j + 1] + 1
                    : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }

    const diff = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (oldLines[i] === newLines[j]) {
            diff.push({ type: "same", line: oldLines[i] });
            i += 1;
            j += 1;
        } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
            diff.push({ type: "removed", line: oldLines[i] });
            i += 1;
        } else {
            diff.push({ type: "added", line: newLines[j] });
            j += 1;
        }
    }
    while (i < n) {
        diff.push({ type: "removed", line: oldLines[i] });
        i += 1;
    }
    while (j < m) {
        diff.push({ type: "added", line: newLines[j] });
        j += 1;
    }

    return diff;
}

function printDiff(baseLabel, againstLabel, baseLines, againstLines) {
    console.log(`--- ${baseLabel}`);
    console.log(`+++ ${againstLabel}`);

    for (const entry of diffLines(baseLines, againstLines)) {
        const prefix =
            entry.type === "same"
                ? "  "
                : entry.type === "removed"
                  ? "- "
                  : "+ ";
        console.log(prefix + entry.line);
    }
}

(async function main() {
    try {
        const options = parseArgs(process.argv.slice(2));

        if (options.help) {
            printHelp();
            return;
        }

        const snippet = resolveSnippet(options);
        if (!snippet) {
            printHelp();
            console.error(
                "\nNo input provided. Pass a snippet, a file path, or pipe text into stdin.",
            );
            process.exit(1);
        }

        await Parser.init();
        const parser = new Parser();
        const wasmPath = path.join(
            __dirname,
            "..",
            "resources",
            "tree-sitter-abl.wasm",
        );
        const Language = await Parser.Language.load(wasmPath);
        parser.setLanguage(Language);

        const tree = parser.parse(snippet);

        if (options.json) {
            const payload = nodeToJson(tree.rootNode, options.filter);
            console.log(JSON.stringify(payload, null, 2));
            return;
        }

        const againstSnippet = resolveAgainstSnippet(options);
        if (againstSnippet !== null) {
            const againstTree = parser.parse(againstSnippet);
            const baseLines = [];
            const againstLines = [];
            collectNodeLines(tree.rootNode, 0, options, baseLines);
            collectNodeLines(againstTree.rootNode, 0, options, againstLines);
            printDiff(
                options.file || "snippet",
                options.againstFile || "against",
                baseLines,
                againstLines,
            );
            return;
        }

        const root = tree.rootNode;
        printNode(root, 0, options);
    } catch (error) {
        console.error("ERROR:", error.message || error);
        process.exit(1);
    }
})();
