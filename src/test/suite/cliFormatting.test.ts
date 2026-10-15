import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

import { ConfigurationManager } from "../../utils/ConfigurationManager";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import { format, setupParserHelper } from "../../utils/suitesUtils";

suite("CLI Formatting Examples", () => {
    const extensionRoot = path.resolve(__dirname, "../../../");
    const fixtureDir = path.join(
        extensionRoot,
        "resources/functionalTests/assign/9newLine-RightAlign-sameEndDot"
    );
    const settingsPath = path.join(
        extensionRoot,
        "resources/functionalTests/settings.json"
    );

    let parserHelper: Awaited<ReturnType<typeof setupParserHelper>>;

    suiteSetup(async () => {
        enableFormatterDecorators();
        ConfigurationManager.getInstance().setOverridingSettings(
            JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
        );
        parserHelper = await setupParserHelper();
    });

    test("formats a real assign fixture into the expected output", () => {
        const inputText = fs.readFileSync(
            path.join(fixtureDir, "input.p"),
            "utf-8"
        );
        const targetText = fs.readFileSync(
            path.join(fixtureDir, "target.p"),
            "utf-8"
        );
        const resultText = format(
            inputText,
            "assign/9newLine-RightAlign-sameEndDot",
            parserHelper
        );

        assert.notStrictEqual(normalize(inputText), normalize(resultText));
        assert.strictEqual(normalize(resultText), normalize(targetText));
    });

    test("keeps output available when tree-sitter reports errors", () => {
        const errorExamplePath = path.join(
            extensionRoot,
            "resources/cliExamples/error-example.p"
        );
        const errorText = fs.readFileSync(errorExamplePath, "utf-8");
        const resultText = format(
            errorText,
            "cliExamples/error-example",
            parserHelper
        );

        assert.ok(resultText.length > 0);
        assert.ok(resultText.includes("FUNCTION GET_STUFF"));
    });
});

function normalize(text: string): string {
    return text.replaceAll("\r\n", "\n").trimEnd();
}