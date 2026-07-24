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