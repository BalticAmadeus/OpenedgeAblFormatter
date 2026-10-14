# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

> This file is the single source of truth for the triage rule and the formatter recipe below.

## ⚠️ Top rule: parser-first triage

**Before changing any formatter code, determine whether the bug is a parser (tree-sitter grammar) bug.**

The formatter has **no lexer of its own**. It formats the AST produced by the compiled tree-sitter grammar vendored at `resources/tree-sitter-abl.wasm`. If the AST is wrong, **do not patch around it here**: the fix belongs upstream in the grammar, then vendor the rebuilt `.wasm` (steps in [CONTRIBUTING.md](CONTRIBUTING.md)).

### `ERROR` nodes: three cases, don't conflate them

`SyntaxNodeType.Error` is handled in ~24 places across the formatters, so seeing it in the code is **not** licence to add more of the same. There are three distinct situations:

| Situation | What to do |
| --- | --- |
| Node typed `ERROR` whose text is literally `ERROR` — the **ABL keyword** (`RETURN ERROR.`) | Not a parse failure. Format it normally. (This is the `node.text.trim() !== "ERROR"` guard in `AblParserHelper.getNodesWithErrors()`.) |
| Node typed `ERROR` from a **real parse failure** | **Passthrough only**: emit `FormatterHelper.getCurrentText(node, fullText)` verbatim so the user's source survives untouched. This is what every existing `case SyntaxNodeType.Error:` does. |
| Wanting to **interpret** the error node's content and rebuild formatting from it | **Forbidden.** Report the grammar bug upstream instead. |

The third row is the one that gets rationalized into existence. It takes any shape that treats the error node's content as meaningful — matching its text against a string or regex, checking its parent/sibling types, keying off its position — and uses that to rebuild the formatting the parser should have produced. No version of this is acceptable, however narrow or well-tested. It is guesswork about what the parser failed to do, it silently affects every construct that formatter handles — not just the case you tested — and it leaves the real grammar bug in place and invisible.

**Finding a parser bug is a successful outcome, not a failed task.** When triage lands there, the deliverable is: minimal repro + the `inspect-abl` AST dump + a report of the grammar gap. Do not substitute a formatter change because stopping feels like not finishing.

## Architecture

- `src/extension.ts` — entry point; registers the formatting providers.
- `src/parser/AblParserHelper.ts` — thin wrapper around **web-tree-sitter**; loads `resources/tree-sitter-abl.wasm` and produces the tree. Tokenization and AST node shapes come **entirely from the .wasm**.
- `src/formatterFramework/` — two-pass AST walker producing `CodeEdit`s.
- `src/formatters/` — one formatter per language construct, matched against AST node types.
- `src/providers/` — VS Code adapters (formatting, preview, debug hover).

## Invariants a formatter change must not break

- **Pass 1 vs Pass 2**: Pass 1 (general formatters) may change line count; **Pass 2 (block indentation) must preserve it**. If a change to a formatter shifts lines during indentation, that's a bug even if the diff "looks right" — indentation-only changes should never add/remove lines.
- **Idempotency**: formatting already-formatted code must be a no-op — `format(format(x)) === format(x)`. `src/mtest/` (`MetamorphicEngine`, `npm run test-w-metamorphic`) checks this and other metamorphic relations (e.g. `Idempotence.ts`) at runtime; a formatter that only passes its own fixture once but drifts on a second pass will fail here.

## Adding a new formatter

A formatter is always these five pieces — miss one and it silently won't run. See `src/formatters/find/` as the reference pair:

1. `src/formatters/<name>/<Name>Formatter.ts` — implements `IFormatter` (`match`/`compare`/`parse`), extends `AFormatter`, decorated with `@RegisterFormatter`.
2. `src/formatters/<name>/<Name>Settings.ts` — extends `ASettings`, exposes the enable/disable getter(s) the formatter reads from `IConfigurationManager`.
3. **Import the new formatter class in `src/formatterFramework/enableFormatterDecorators.ts`** and reference it in `enableFormatterDecorators()`. The `@RegisterFormatter` decorator only runs if the class is reachable from executed code — an unimported formatter is dead code that silently never matches anything.
4. A matching setting under `contributes.configuration` in `package.json` (e.g. `AblFormatter.<name>Formatting`), so it's toggleable and shows up in VS Code settings.
5. A functional test fixture pair — `resources/functionalTests/<name>/<case>/input.p` + `target.p` — see "Test Writing Goals" in [CLAUDE.md](CLAUDE.md) and "Development practices" in [CONTRIBUTING.md](CONTRIBUTING.md) for naming conventions and what a "good" test covers.

## Parser inspection tool: `scripts/inspect-abl.js`

Loads the same `resources/tree-sitter-abl.wasm` the extension loads and prints the real parse tree — use it before changing formatter logic whenever a bug might depend on AST structure.

```bash
npm run inspect-abl -- "if x = y then do: end."
npm run inspect-abl -- --file resources/samples/ifelse1.p
npm run inspect-abl -- --filter if_statement --json "if x = y then do: end."
npm run inspect-abl -- --show-ancestors "if x = y then do: end."
npm run inspect-abl -- --against-file good.p --file bug.p
```

`--against`/`--against-file` prints a unified diff between two parse trees — this is the tool for
the "isolate the suspicious sub-expression and diff its tree against the same construct in an
unambiguous context" step below.

It has no built-in "this is a parser bug" signal — it just prints the tree. Read it yourself using the decision procedure below.

## Decision procedure: parser bug or formatter bug?

1. **Reproduce** on the smallest possible `.p` snippet.
2. **Diff the before/after first — it's often conclusive and costs nothing.** A bug report already contains both. Strip all whitespace from each and compare:
   - **Characters differ → parser bug.** The formatter only decides whitespace and line breaks; it re-emits source slices verbatim via `getCurrentText()`. It has no mechanism to alter identifier text, so a changed character came from a bad AST leaf. Classic shape: a space appearing *inside* an identifier (`GenTools` → `Gen Tools`) — no `ERROR` node, invisible to error counting. Stop here; fix the grammar.
   - **Only whitespace differs → unresolved.** Could be either. Continue to the AST inspection below.
   - (Exception: `ifFunctionFormattingAddParentheses` and `usingFormattingFromPropath` legitimately add characters. The rule holds with them off.)
3. **Inspect the AST**: `npm run inspect-abl -- --file bug.p` (or the VS Code debug hover — `AblFormatter.showTreeInfoOnHover` / status-bar debug mode).
4. **A missing `ERROR`/`MISSING` node is not proof the AST is right.** Check both of these — either one failing means parser bug:
   - **Leaf text**: does each identifier appear as a single leaf with its full text, not as two adjacent leaves that together spell it? An identifier split at a keyword prefix — say `SomeField` emerging as a keyword leaf plus `omeField` — can produce **no `ERROR` node at all**. Wrong tokenization parses "cleanly", so read leaf token text rather than only scanning for error nodes.
   - **Node type**: does the node type at the point of interest match what ABL semantics say this construct should produce? A standalone `OTHERWISE.` should sit inside a `case_otherwise_branch`; if it's an `ERROR` node sibling of `body` instead, that's wrong regardless of what the text says.
   - If it still looks ambiguous, **isolate the suspicious sub-expression into its own minimal snippet and diff its tree against the same construct in an unambiguous context** — the difference between the two trees is the evidence. Tokenization bugs are often positional: a name may parse correctly alone but split when it follows another token, so vary the surrounding context rather than testing one snippet.
   - **AST wrong → parser bug.** Typical signatures: identifiers split at keyword prefixes, merged/missing tokens, `ERROR`/`MISSING` nodes on valid ABL, or a node typed correctly but not matching the construct's real grammar rule. Fix it upstream in the grammar, rebuild + vendor the `.wasm`, then add the snippet as a regression test. **Do not edit formatter source for this.**
   - **AST correct, output wrong → formatter bug.** Fix here normally: formatter in `src/formatters/` + functional tests in `resources/functionalTests/`.

## Symptom → layer

| Symptom | Layer |
| --- | --- |
| Output differs from input after stripping all whitespace — characters, not just spacing, changed | **Parser** |
| Identifier loses/gains characters or gets split in the output — **no `ERROR` node required** | **Parser** |
| Keyword prefixes (`MOD`, `NOT`, `CONTAINS`, `MATCHES`, `BEGINS`, `LT`, `GT`, `EQ`, `GE`, `LE`, `NE`, …) break identifiers | **Parser** |
| `ERROR`/`MISSING` nodes for valid ABL | **Parser** |
| A construct's node isn't the type its grammar rule should produce, even with a clean-looking tree (e.g. a case branch that should be `case_otherwise_branch` isn't) | **Parser** |
| Wrong indentation / spacing although the AST is correct | **Formatter** |
| Construct formatted but the layout should differ | **Formatter** (settings or formatter code) |

## Links

- Contributing & `.wasm` rebuild steps: [CONTRIBUTING.md](CONTRIBUTING.md)
- AST inspection tool: [scripts/inspect-abl.js](scripts/inspect-abl.js)
- Debug hover: README ["Debugging"](README.md)
- Tests: `npm test`, `npm run test-w-metamorphic`, `npm run test-ast`, `npm run test-symbol`, `npm run test-compilation`
