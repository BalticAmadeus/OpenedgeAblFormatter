# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenEdge ABL Formatter is a VS Code extension that formats Progress OpenEdge ABL code using tree-sitter for AST parsing. Published on the VS Code Marketplace by Baltic Amadeus.

## Commands

**Build:**
```bash
npm run build          # Development build with sourcemaps (esbuild + copy WASM)
npm run compile        # TypeScript type-check only (tsc --noEmit equivalent)
npm run vscode:prepublish  # Minified production build
npm run watch          # TypeScript watch mode
```

**Lint:**
```bash
npm run lint           # ESLint on src/ (eslint src --ext ts)
```

**Test:**
```bash
npm test                    # Functional tests (Mocha)
npm run test-w-metamorphic  # Functional + metamorphic property tests
npm run test-ast            # AST validation tests (requires ADE repo)
npm run test-compilation    # Compilation/compatibility tests
```

To run a single test file after building:
```bash
npx mocha ./out/test/suite/extension.test.js
```

Mocha timeout is 20 seconds (`.mocharc.js`). Test fixtures live in `resources/functionalTests/`.

## Running Tests (Agent Workflow)

When asked to run tests, use this pattern (tests require VS Code host and take ~30s):

1. Build and start tests in background: `npm run build 2>&1 | tail -3 && npm test 2>&1` with `run_in_background: true`
2. Monitor for completion: poll the output file until `passing|failing` appears, then print the summary line

## Architecture

The extension activates on `onLanguage:abl` and follows a three-layer design:

### 1. Entry Point (`src/extension.ts`)
Initializes tree-sitter parser, registers VS Code document formatting providers (full document + range), registers the debug hover provider, and schedules periodic metamorphic testing.

### 2. Formatting Engine (`src/formatterFramework/`)
`FormattingEngine` orchestrates a **two-pass AST walk**:
- **Pass 1**: Applies all general formatters (may change line count)
- **Pass 2**: Applies block indentation only (must preserve line count)

This two-pass design prevents unexpected line wrapping during indentation adjustments. `FormatterFactory` uses a decorator-based registry — formatters self-register via `@RegisterFormatter` with no manual wiring required.

### 3. Formatter Plugins (`src/formatters/`)
19 specialized formatters, one per language construct (ASSIGN, IF, CASE, FOR, FIND, USING, blocks, etc.). Each formatter pair:
- `[Feature]Formatter.ts` — implements `IFormatter` (match node, parse, compare/format)
- `[Feature]Settings.ts` — declares VS Code configuration contribution

`AFormatter` is the base class. `DefaultFormatter` handles any unregistered node type.

### Supporting Layers
- **`src/parser/`** — `AblParserHelper` wraps web-tree-sitter; manages WASM loading and file parsing
- **`src/providers/`** — VS Code API adapters: `AblFormatterProvider` (formatting), `AblDebugHoverProvider` (debug overlay), `DebugManager`
- **`src/utils/ConfigurationManager`** — merges VS Code workspace settings with per-file overrides
- **`src/mtest/`** — `MetamorphicEngine` runs property-based tests at runtime (idempotency, commutativity)
- **`src/model/`** — shared data structures (`CodeEdit`, `FullText`, `ParseResult`, `EOL`)

### Data Flow
```
User triggers format
  → AblFormatterProvider
  → FormattingEngine.formatText()
  → Parse ABL into AST (tree-sitter)
  → Apply file-level settings overrides
  → Pass 1: walk AST, match formatters, generate CodeEdits
  → Pass 2: block indentation
  → Return edits to VS Code
```

## Key Patterns

**Decorator registry**: Add `@RegisterFormatter` to a new formatter class and it is automatically discovered — no manual registration needed. Import the class in `enableFormatterDecorators.ts`.

**Settings override**: A file can override VS Code settings by including a leading comment:
```abl
/* formatterSettingsOverride */
/*  { "ablFormatter.assignFormatting": false } */
```

**Test fixtures**: Functional tests use `.abl` input/output pairs in `resources/functionalTests/<FormatterName>/`. Add a new subfolder + file pair to test a formatter.

## Test Writing Goals

Every new functional test serves one of two purposes — and ideally both at once:

### 1. Expose formatter bugs (tests that fail)
Write tests where the **target reflects the correct desired output** even when the formatter does not yet produce it. A failing test is a bug report baked into the suite.

Common bug patterns found so far:
- **Unrecognised statement types**: `RUN`, `ACCUMULATE` (full word) are not in `StatementFormatter`'s match list — spaces are left unchanged.
- **Inner-node spaces not normalised**: `StatementFormatter.collectStatement()` calls `getCurrentText(child).trim()` which only strips leading/trailing whitespace from a child AST node. Spaces *inside* a single child node (e.g. `AMBIGUOUS   Customer`, `CAN-FIND(FIRST   Customer   WHERE ...)`, `CAST(a,   B)`) are preserved unchanged.
- **Unhandled definition variants**: `DEFINE DATASET` and `DEFINE EVENT` are not handled by `VariableDefinitionFormatter`; `PARAMETER TABLE FOR` is not handled by `ProcedureParameterFormatter`.
- **Partial token normalisation**: `BEFORE-TABLE   value` and `OUTER-JOIN` clauses retain extra spaces because their sub-tokens are a single child node.
- **Indentation calculation bugs**: `NOT (expr AND\n...)` aligns to the wrong column; deeply nested `do transaction: repeat:` blocks are over-indented.

### 2. Cover the basics (tests that pass)
Write at least one passing test per ABL construct so regressions are caught immediately. A passing test confirms the formatter handles that path correctly today.

### Checklist when adding tests for a new construct
- [ ] **Basic case** — single-line with extra spaces between all top-level tokens → normalised to single spaces (confirms the node type is matched).
- [ ] **Inner-expression spaces** — extra spaces *inside* function arguments, expression sub-nodes, or keyword pairs → should be normalised (often exposes the inner-node bug).
- [ ] **Disabled / no-op** — formatter setting disabled, input == target, confirms nothing changes.
- [ ] **Multiline / complex** — real-world multi-token form to catch indentation and line-break behaviour.

### How to verify a test exposes a real bug
Run `npm test` after adding the test. Compare the result file in `resources/testResults/functionalTests/` against the target:
- If the result file shows the *input* unchanged → the node type is not matched by any formatter.
- If the result file shows *partial* normalisation → a child node's internal spaces are not processed.
- If the result file shows *wrong indentation* → indentation calculation is off.

**Telemetry**: Reports formatter setting usage to Azure Application Insights via `@vscode/extension-telemetry`. Can be disabled by the user.

## Configuration

All formatters are individually enable/disable-able via VS Code settings (`ablFormatter.<feature>.enabled`). Settings are contributed in each `[Feature]Settings.ts` and declared in `package.json` under `contributes.configuration`.
