import * as assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

suite("CLI Regression", function () {
    this.timeout(120000);
    const extensionRoot = path.resolve(__dirname, "../../../");
    const cliPath = path.join(extensionRoot, "out/cli/cli.js");
    const fixtureDir = path.join(
        extensionRoot,
        "resources/functionalTests/assign/9newLine-RightAlign-sameEndDot"
    );
    const settingsPath = path.join(
        extensionRoot,
        "resources/functionalTests/settings.json"
    );

    test("formats a fixture copy through the built CLI and stays idempotent", () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-regression-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);
        const tempInputPath = path.join(tempDir, "input.p");
        const originalInput = fs.readFileSync(path.join(fixtureDir, "input.p"), "utf8");
        fs.copyFileSync(path.join(fixtureDir, "input.p"), tempInputPath);

        const writeResult = spawnSync(process.execPath, [
            cliPath,
            tempInputPath,
            "--write",
            "--config",
            settingsPath,
        ], {
            encoding: "utf8",
            env: {
                ...process.env,
                ABL_FORMATTER_QUIET: "1",
                NODE_PATH: nodePathDir,
            },
        });

        assert.strictEqual(writeResult.status, 0, writeResult.stderr);

        const formatted = fs.readFileSync(tempInputPath, "utf8");

        assert.notStrictEqual(normalize(formatted), normalize(originalInput));
        assert.match(writeResult.stdout, /Formatted:/);

        const checkResult = spawnSync(process.execPath, [
            cliPath,
            tempInputPath,
            "--check",
            "--config",
            settingsPath,
        ], {
            encoding: "utf8",
            env: {
                ...process.env,
                ABL_FORMATTER_QUIET: "1",
                NODE_PATH: nodePathDir,
            },
        });

        assert.strictEqual(checkResult.status, 0, checkResult.stderr);
        assert.match(checkResult.stdout, /already formatted/);
    });

    test("exposes telemetry opt-in without breaking help or formatting", () => {
        const helpResult = spawnSync(process.execPath, [cliPath, "--help"], {
            encoding: "utf8",
            env: {
                ...process.env,
                NODE_PATH: createVscodeModulePath(
                    fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-help-")),
                    extensionRoot
                ),
            },
        });

        assert.strictEqual(helpResult.status, 0, helpResult.stderr);
        assert.match(helpResult.stdout, /--telemetry/);

        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-telemetry-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);
        const tempInputPath = path.join(tempDir, "input.p");
        fs.copyFileSync(path.join(fixtureDir, "input.p"), tempInputPath);

        const telemetryResult = spawnSync(process.execPath, [
            cliPath,
            tempInputPath,
            "--write",
            "--config",
            settingsPath,
            "--telemetry",
        ], {
            encoding: "utf8",
            env: {
                ...process.env,
                ABL_FORMATTER_QUIET: "1",
                ABL_FORMATTER_TELEMETRY: "1",
                ABL_FORMATTER_TELEMETRY_KEY: "InstrumentationKey=00000000-0000-0000-0000-000000000000",
                NODE_PATH: nodePathDir,
            },
        });

        assert.strictEqual(telemetryResult.status, 0, telemetryResult.stderr);
        assert.match(telemetryResult.stdout, /Formatted:/);
    });

    test("exits 1 with an error message when the file does not exist", () => {
        const nodePathDir = createVscodeModulePath(
            fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-missing-file-")),
            extensionRoot
        );

        const result = spawnSync(process.execPath, [
            cliPath,
            path.join(os.tmpdir(), "this-file-does-not-exist.p"),
        ], {
            encoding: "utf8",
            env: { ...process.env, NODE_PATH: nodePathDir },
        });

        assert.strictEqual(result.status, 1);
        assert.match(result.stderr, /File not found/);
    });

    test("a nonexistent --config path warns and falls back to defaults, instead of failing silently", () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-badconfig-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);
        const tempInputPath = path.join(tempDir, "input.p");
        fs.copyFileSync(path.join(fixtureDir, "input.p"), tempInputPath);

        const result = spawnSync(process.execPath, [
            cliPath,
            tempInputPath,
            "--config",
            path.join(tempDir, "does-not-exist.json"),
        ], {
            encoding: "utf8",
            env: { ...process.env, NODE_PATH: nodePathDir },
        });

        assert.strictEqual(result.status, 0, result.stderr);
        assert.match(result.stderr, /Config file not found/);
    });

    test("--check exits 1 and reports that a file would be reformatted", () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-check-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);
        const tempInputPath = path.join(tempDir, "input.p");
        fs.copyFileSync(path.join(fixtureDir, "input.p"), tempInputPath);

        const checkResult = spawnSync(process.execPath, [
            cliPath,
            tempInputPath,
            "--check",
            "--config",
            settingsPath,
        ], {
            encoding: "utf8",
            env: {
                ...process.env,
                ABL_FORMATTER_QUIET: "1",
                NODE_PATH: nodePathDir,
            },
        });

        assert.strictEqual(checkResult.status, 1);
        assert.match(checkResult.stdout, /would be reformatted/);
    });

    test("--config actually changes formatting output, not just the default settings", () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-config-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);

        const defaultResult = spawnSync(process.execPath, [
            cliPath,
            path.join(fixtureDir, "input.p"),
            "--config",
            settingsPath,
        ], {
            encoding: "utf8",
            env: { ...process.env, ABL_FORMATTER_QUIET: "1", NODE_PATH: nodePathDir },
        });

        const customSettingsPath = path.join(tempDir, "custom.ablformatter.json");
        const customSettings = {
            ...JSON.parse(fs.readFileSync(settingsPath, "utf8")),
            assignFormattingAssignLocation: "Same",
        };
        fs.writeFileSync(customSettingsPath, JSON.stringify(customSettings), "utf8");

        const customResult = spawnSync(process.execPath, [
            cliPath,
            path.join(fixtureDir, "input.p"),
            "--config",
            customSettingsPath,
        ], {
            encoding: "utf8",
            env: { ...process.env, ABL_FORMATTER_QUIET: "1", NODE_PATH: nodePathDir },
        });

        assert.strictEqual(defaultResult.status, 0, defaultResult.stderr);
        assert.strictEqual(customResult.status, 0, customResult.stderr);
        assert.notStrictEqual(
            normalize(defaultResult.stdout),
            normalize(customResult.stdout)
        );
    });

    test("--config before the filename formats the file, not the config", () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-argorder-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);
        const tempInputPath = path.join(tempDir, "input.p");
        fs.copyFileSync(path.join(fixtureDir, "input.p"), tempInputPath);

        // The config path does not start with "-", so a naive "first non-flag
        // argument" scan picks it as the input file and formats the JSON.
        const configFirst = spawnSync(process.execPath, [
            cliPath,
            "--config",
            settingsPath,
            tempInputPath,
        ], {
            encoding: "utf8",
            env: { ...process.env, ABL_FORMATTER_QUIET: "1", NODE_PATH: nodePathDir },
        });

        const fileFirst = spawnSync(process.execPath, [
            cliPath,
            tempInputPath,
            "--config",
            settingsPath,
        ], {
            encoding: "utf8",
            env: { ...process.env, ABL_FORMATTER_QUIET: "1", NODE_PATH: nodePathDir },
        });

        assert.strictEqual(configFirst.status, 0, configFirst.stderr);
        assert.strictEqual(fileFirst.status, 0, fileFirst.stderr);

        // Both orders must produce the same formatted ABL, and neither may emit
        // the config file's JSON.
        assert.strictEqual(
            normalize(configFirst.stdout),
            normalize(fileFirst.stdout)
        );
        assert.doesNotMatch(configFirst.stdout, /"assignFormatting"/);
    });

    test("multiple files exit 1 instead of silently checking only the first", () => {
        // Guards a CI false-negative: `abl-format *.p --check` expands to many
        // files; checking only the first would exit 0 and let unformatted files
        // through a formatting gate unnoticed.
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-multifile-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);

        const formatted = path.join(tempDir, "a-formatted.p");
        const unformatted = path.join(tempDir, "b-unformatted.p");
        fs.copyFileSync(path.join(fixtureDir, "target.p"), formatted);
        fs.copyFileSync(path.join(fixtureDir, "input.p"), unformatted);

        const result = spawnSync(process.execPath, [
            cliPath,
            formatted,
            unformatted,
            "--check",
            "--config",
            settingsPath,
        ], {
            encoding: "utf8",
            env: { ...process.env, ABL_FORMATTER_QUIET: "1", NODE_PATH: nodePathDir },
        });

        assert.strictEqual(result.status, 1);
        assert.match(result.stderr, /Expected exactly one file/);
    });

    test("a directory argument is reported clearly rather than as a raw EISDIR", () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-isdir-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);
        const subDir = path.join(tempDir, "some-directory");
        fs.mkdirSync(subDir);

        const result = spawnSync(process.execPath, [cliPath, subDir], {
            encoding: "utf8",
            env: { ...process.env, ABL_FORMATTER_QUIET: "1", NODE_PATH: nodePathDir },
        });

        assert.strictEqual(result.status, 1);
        assert.match(result.stderr, /Not a file/);
        assert.doesNotMatch(result.stderr, /EISDIR/);
    });

    test("--config without a value exits 1 instead of silently using defaults", () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-noconfigval-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);
        const tempInputPath = path.join(tempDir, "input.p");
        fs.copyFileSync(path.join(fixtureDir, "input.p"), tempInputPath);

        const result = spawnSync(process.execPath, [cliPath, tempInputPath, "--config"], {
            encoding: "utf8",
            env: { ...process.env, ABL_FORMATTER_QUIET: "1", NODE_PATH: nodePathDir },
        });

        assert.strictEqual(result.status, 1);
        assert.match(result.stderr, /--config requires a value/);
    });

    test("an invalid telemetry key is rejected without crashing or blocking output", () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "abl-cli-bad-telemetry-"));
        const nodePathDir = createVscodeModulePath(tempDir, extensionRoot);
        const tempInputPath = path.join(tempDir, "input.p");
        fs.copyFileSync(path.join(fixtureDir, "input.p"), tempInputPath);

        const result = spawnSync(process.execPath, [
            cliPath,
            tempInputPath,
            "--write",
            "--config",
            settingsPath,
            "--telemetry",
        ], {
            encoding: "utf8",
            env: {
                ...process.env,
                ABL_FORMATTER_QUIET: "1",
                ABL_FORMATTER_TELEMETRY: "1",
                ABL_FORMATTER_TELEMETRY_KEY: "not-a-real-key",
                NODE_PATH: nodePathDir,
            },
        });

        assert.strictEqual(result.status, 0, result.stderr);
        assert.match(result.stdout, /Formatted:/);
    });
});

function normalize(text: string): string {
    return text.replaceAll("\r\n", "\n").trimEnd();
}

function createVscodeModulePath(tempDir: string, extensionRoot: string): string {
    const nodeModulesDir = path.join(tempDir, "node_modules");
    const vscodeDir = path.join(nodeModulesDir, "vscode");
    fs.mkdirSync(vscodeDir, { recursive: true });

    const stubPath = path.join(extensionRoot, "src/cli/vscode-stub.js");
    fs.writeFileSync(
        path.join(vscodeDir, "index.js"),
        `module.exports = require(${JSON.stringify(stubPath)});\n`,
        "utf8"
    );

    return nodeModulesDir;
}