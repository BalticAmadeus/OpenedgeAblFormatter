# AGENTS.md

## Parser inspection tool for ABL snippets

When debugging formatting or parser behavior, use the repo's tree-sitter inspector before changing formatter logic.

### Command

```bash
npm run inspect-abl -- "if x = y then do: end."
```

### What it does

This script loads the same tree-sitter ABL WASM grammar used by the extension and prints the real parse tree for the provided snippet. It is the fastest way to answer questions such as:

- What exact node type does this code parse as?
- Which ancestor chain does the formatter see?
- Why is a snippet falling through to a default formatter?
- Is the expected parse structure actually being produced by the grammar?

### Useful variants

```bash
npm run inspect-abl -- --file resources/samples/ifelse1.p
npm run inspect-abl -- --filter if_statement --json "if x = y then do: end."
npm run inspect-abl -- --show-ancestors "if x = y then do: end."
```

### Guideline

Prefer this tool over guessing when a formatter bug depends on AST structure. If the issue is parser-related or formatter-node matching related, inspect the real parse tree first.
