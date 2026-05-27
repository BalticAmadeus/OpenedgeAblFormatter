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

### Option 2: Global Installation (when published to npm)

```bash
npm install -g abl-format
abl-format --help
```

### Option 3: Via npx

```bash
npx abl-format myfile.p
```

## Usage

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

Load formatting settings from a JSON configuration file.

### Verbose Output

```bash
abl-format myfile.p --verbose
```

Show diagnostic information during formatting.

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

### GitHub Actions Example

```yaml
- name: Check ABL formatting
  run: |
    npm install
    npm run build-cli
    node out/cli/cli.js --check "**/*.p" "**/*.cls" "**/*.i"
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

## Performance

The CLI formatter is optimized for single-file operations. For batch processing of many files, consider:

1. Using parallel execution with tools like GNU `parallel` or `xargs`
2. Running the formatter once per file to avoid memory overhead
3. Setting up CI/CD jobs to process files in groups

## Limitations

- The CLI supports the same formatting rules as the VS Code extension
- File-level formatting overrides (comments in ABL source) are not supported in CLI mode
- Telemetry is disabled in CLI mode

## Building from Source

```bash
# Development build
npm run build-cli-dev

# Production build (minified)
npm run build-cli-prod

# Watch mode
npm run watch
npm run build-cli-dev
```

## License

See [LICENSE](../LICENSE) file in the repository root.
