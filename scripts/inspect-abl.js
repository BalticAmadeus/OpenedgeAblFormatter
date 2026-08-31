#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Parser = require('web-tree-sitter');

function printHelp() {
  console.log(`OpenEdge ABL tree-sitter inspector

Usage:
  node scripts/inspect-abl.js "if x = y then do: end."
  node scripts/inspect-abl.js --file resources/samples/ifelse1.p
  node scripts/inspect-abl.js --filter if_statement --json "if x = y then do: end."

Options:
  --file <path>        Read snippet from a file
  --json               Print compact JSON
  --filter <type>      Show only nodes matching the given tree-sitter type and their ancestors
  --show-ancestors     Show ancestors for every node in text output
  --help               Show this help

Notes:
  This uses the same tree-sitter ABL grammar as the formatter, so it reflects the real parse tree
  that the extension sees instead of a guessed AST.
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

    if (arg === '--help') {
      options.help = true;
      continue;
    }

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--show-ancestors') {
      options.showAncestors = true;
      continue;
    }

    if (arg === '--filter') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing value for --filter');
      }
      options.filter = next;
      i += 1;
      continue;
    }

    if (arg === '--file') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing value for --file');
      }
      options.file = next;
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
    return fs.readFileSync(fullPath, 'utf8');
  }

  if (options.positional.length > 0) {
    return options.positional.join(' ');
  }

  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, 'utf8');
  }

  return null;
}

function nodeToJson(node, filter = null) {
  if (!node) {
    return null;
  }

  const json = {
    type: node.type,
    text: node.text,
    start: node.startPosition,
    end: node.endPosition,
    startIndex: node.startIndex,
    endIndex: node.endIndex,
    childCount: node.childCount,
    children: [],
  };

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

function printNode(node, depth = 0, options) {
  const indent = '  '.repeat(depth);
  const isMatch = options.filter && node.type === options.filter;

  console.log(
    `${indent}${isMatch ? '[MATCH] ' : ''}${node.type} | ${node.startPosition.row}:${node.startPosition.column} -> ${node.endPosition.row}:${node.endPosition.column}`
  );

  if (options.showAncestors && node.parent) {
    const ancestors = [];
    let current = node.parent;
    while (current) {
      ancestors.unshift(current.type);
      current = current.parent;
    }
    console.log(`${indent}  ancestors: ${ancestors.join(' > ')}`);
  }

  if (node.childCount > 0) {
    for (const child of node.children) {
      printNode(child, depth + 1, options);
    }
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
      console.error('\nNo input provided. Pass a snippet, a file path, or pipe text into stdin.');
      process.exit(1);
    }

    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.join(__dirname, '..', 'resources', 'tree-sitter-abl.wasm');
    const Language = await Parser.Language.load(wasmPath);
    parser.setLanguage(Language);

    const tree = parser.parse(snippet);

    if (options.json) {
      const payload = nodeToJson(tree.rootNode, options.filter);
      console.log(JSON.stringify(payload, null, 2));
      return;
    }

    const root = tree.rootNode;
    printNode(root, 0, options);
  } catch (error) {
    console.error('ERROR:', error.message || error);
    process.exit(1);
  }
})();
