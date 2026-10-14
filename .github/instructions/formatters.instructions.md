---
description: "Parser-first triage rule for OpenEdge ABL formatter code. Use when editing src/formatters/** or src/formatterFramework/**, especially any SyntaxNodeType.Error handling."
applyTo: "src/formatters/**, src/formatterFramework/**"
---

Before changing this file, read the "Top rule: parser-first triage" section in [AGENTS.md](../../AGENTS.md).

- If the bug is a wrong AST (split/merged tokens, wrong node type, unexpected `ERROR`/`MISSING` node on valid ABL), the fix belongs upstream in the tree-sitter grammar, not here. Use `npm run inspect-abl` to check the AST before touching formatter logic.
- Every `case SyntaxNodeType.Error:` must stay passthrough-only (`FormatterHelper.getCurrentText(node, fullText)`). Never branch on the error node's text/position/siblings to reconstruct formatting — that hides a real grammar bug instead of fixing it.
- A formatter change must not break the two-pass invariants: Pass 1 may change line count, Pass 2 (indentation) must not. Formatting must be idempotent (`format(format(x)) === format(x)`).
