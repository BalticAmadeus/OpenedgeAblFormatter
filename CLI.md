# ABL Formatter CLI

A command-line interface for the OpenEdge ABL Formatter. Format your Progress OpenEdge ABL code directly from your terminal or CI/CD pipeline.

## Installation

You can use the CLI in several ways:

### Option 1: Local Development (from this repository)

```bash
npm install
npm run build-cli
node out/cli/cli.js --help
```

To try the real `abl-format` command name before the package is published,
link it locally — this points a global `abl-format` command at your local
build (rebuild with `npm run build-cli` after any change; the link does not
auto-rebuild):

```bash
npm link
abl-format --help
```

Remove it later with `npm uninstall -g openedge-abl-formatter`.

### Option 2: From an installed VS Code extension

The CLI ships inside the extension package, so if you already have the
OpenEdge ABL Formatter installed you can run it without cloning anything.
VS Code does not put extension binaries on your `PATH`, so invoke it via `node`:

```bash
# Linux / macOS
node ~/.vscode/extensions/BalticAmadeus.openedge-abl-formatter-*/out/cli/cli.js myfile.p

# Windows (PowerShell)
node $env:USERPROFILE\.vscode\extensions\BalticAmadeus.openedge-abl-formatter-*\out\cli\cli.js myfile.p
```

Add a shell alias or function if you use it often.

### Option 3: Global installation via npm (not yet available)

The package is not currently published to npm. Once it is, the `bin` entry in
`package.json` will make the following work:

```bash
npm install -g openedge-abl-formatter
abl-format --help
```

### Option 4: Via npx (not yet available)

Also depends on the package being published. Once it is, this runs the CLI
on demand without a global install:

```bash
npx openedge-abl-formatter myfile.p
```

## Usage

Each invocation takes exactly **one** file. Passing more than one is an error
(exit code `1`) rather than silently formatting just the first — otherwise
`abl-format *.p --check` would expand to many files, check only one, and exit
`0`, quietly letting unformatted files through a CI gate. There is no glob
expansion or batch mode built in; loop over files yourself (see
[CI/CD Integration](#cicd-integration) below).

### Basic Formatting (output to stdout)

```bash
abl-format myfile.p
```

Outputs the formatted code to standard output, leaving the original file unchanged.

### Format in Place

```bash
abl-format myfile.p --write
```

Overwrites the file with formatted code.

### Check Mode

```bash
abl-format myfile.p --check
```

Checks if a file would be reformatted:
- Exit code `0` if file is already formatted
- Exit code `1` if file would be reformatted

Great for CI/CD pipelines to enforce formatting standards.

### Use Custom Configuration

```bash
abl-format myfile.p --config .ablformatter.json
```

Load formatting settings from a JSON configuration file. If the path doesn't
exist, the CLI prints a warning to stderr and falls back to default settings
rather than failing silently; if the file exists but isn't valid JSON, it
warns and falls back the same way.

### Verbose Output

```bash
abl-format myfile.p --verbose
```

Show diagnostic information during formatting.

### CLI Telemetry

```bash
ABL_FORMATTER_TELEMETRY=1 ABL_FORMATTER_TELEMETRY_KEY=... abl-format myfile.p --telemetry
```

CLI telemetry is opt-in and best-effort. If no key is provided — or the key is
not a valid instrumentation key / connection string — the formatter runs
normally and sends nothing. Telemetry failures never affect formatting or the
exit code.

Two events are sent per run:

| Event | Properties | Measures |
| --- | --- | --- |
| `CLI.Format` | `mode` (`write`/`check`/`stdout`), `verbose`, `fileExtension` | `characters`, `lines`, `parseErrors`, `durationMs` |
| `CLI.Settings` | `enabledFormatters` (comma-separated list) | `enabledFormatterCount` |

On failure, `CLI.Error` or `CLI.FatalError` is sent with the error message
instead. No file contents, file names, or paths are ever included.

## Configuration File Format

Create a `.ablformatter.json` file in your project root:

```json
{
  "AblFormatter.assignFormatting": true,
  "AblFormatter.assignFormattingAssignLocation": "New",
  "AblFormatter.assignFormattingAlignRightExpression": "Yes",
  "AblFormatter.assignFormattingEndDotLocation": "New aligned",
  "AblFormatter.ifFormatting": true,
  "AblFormatter.caseFormatting": true,
  "AblFormatter.forFormatting": true,
  "AblFormatter.findFormatting": true,
  "AblFormatter.blockFormatting": true,
  "AblFormatter.propertyFormatting": true,
  "AblFormatter.temptableFormatting": true,
  "AblFormatter.usingFormatting": true,
  "AblFormatter.enumFormatting": true,
  "AblFormatter.variableDefinitionFormatting": true,
  "AblFormatter.expressionFormatting": true
}
```

## CI/CD Integration

### Running CLI regression tests locally

The regression suite runs the built CLI through the VS Code test host:

```bash
npm run test-cli-regression
```

This command compiles and lints the source, builds `out/cli/cli.js`, and runs
only the `CLI Regression` suite.

### GitHub Actions Example

The CLI checks one file per invocation, so loop over your files explicitly:

```yaml
- name: Check ABL formatting
  run: |
    npm install
    npm run build-cli
    status=0
    while IFS= read -r -d '' file; do
      node out/cli/cli.js --check "$file" || status=1
    done < <(find . \( -name '*.p' -o -name '*.cls' -o -name '*.i' \) -print0)
    exit $status
```

### Pre-commit Hook Example

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(p|cls|i|w)$')
if [ -z "$FILES" ]; then
  exit 0
fi

for FILE in $FILES; do
  node out/cli/cli.js --check "$FILE"
  if [ $? -ne 0 ]; then
    echo "ABL file not formatted: $FILE"
    echo "Run: node out/cli/cli.js --write '$FILE'"
    exit 1
  fi
done
```

## Examples

### Format all ABL files in a directory

```bash
for file in src/**/*.p src/**/*.cls; do
  abl-format "$file" --write
done
```

### Format and pipe through other tools

```bash
abl-format myfile.p | cat > formatted.p
```

### Validate formatting in CI

```bash
if abl-format myfile.p --check; then
  echo "File is properly formatted"
else
  echo "File needs formatting"
  exit 1
fi
```

## Troubleshooting

### "tree-sitter-abl.wasm not found"

Make sure you've run `npm run build-cli` first to bundle the WASM files.

### Formatting not working as expected

- Check your configuration file syntax
- Use `--verbose` to see what formatters are being applied
- Compare with settings in VS Code extension

## Environment Variables

- `ABL_FORMATTER_QUIET` - Suppress diagnostic logs
- `ABL_FORMATTER_VERBOSE` - Show detailed logs
- `ABL_FORMATTER_TELEMETRY` - Set to `1` or `true` to opt into CLI telemetry
- `ABL_FORMATTER_TELEMETRY_KEY` - Telemetry instrumentation key or connection string
- `ABL_FORMATTER_TELEMETRY_CONNECTION` - Alternate telemetry connection string environment variable

## Performance

The CLI formatter is optimized for single-file operations. For batch processing of many files, consider:

1. Using parallel execution with tools like GNU `parallel` or `xargs`
2. Running the formatter once per file to avoid memory overhead
3. Setting up CI/CD jobs to process files in groups

## Limitations

- The CLI supports the same formatting rules as the VS Code extension,
  including `/* formatterSettingsOverride */` comments in the source file
  itself — they're handled by the same shared formatting engine
- Each invocation processes exactly one file — no glob expansion or batch mode;
  passing multiple files exits `1` with an error rather than silently
  formatting only the first
- Telemetry is opt-in in CLI mode

## Building from Source

```bash
# Development build (with sourcemaps)
npm run build-cli-dev

# Production build (minified)
npm run build-cli-prod
```

There is no watch mode for the CLI bundle itself — `npm run build-cli-dev`
rebuilds `out/cli/cli.js` once per run. `npm run watch` only type-checks the
TypeScript sources in the background; it does not rebuild the CLI bundle, so
re-run `npm run build-cli-dev` after each change you want reflected.

## License

See [LICENSE](../LICENSE) file in the repository root.
