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

**Telemetry**: Reports formatter setting usage to Azure Application Insights via `@vscode/extension-telemetry`. Can be disabled by the user.

## Configuration

All formatters are individually enable/disable-able via VS Code settings (`ablFormatter.<feature>.enabled`). Settings are contributed in each `[Feature]Settings.ts` and declared in `package.json` under `contributes.configuration`.
