import { AblParserHelper } from "./AblParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import path from "path";

const mockDebugManager = {
    parserReady: () => console.log("Parser ready"),
    handleErrors: (tree: any) => console.log("Handling errors for tree"),
    fileFormattedSuccessfully: (numOfEdits: number) =>
        console.log(`Formatted with ${numOfEdits} edits`),
    isInDebugMode: () => false,
};

async function testIntegratedParser() {
    console.log("Testing integrated AblParserHelper with worker process...");

    const extensionPath = path.join(__dirname, "..", "..");
    const parser = new AblParserHelper(extensionPath, mockDebugManager);

    try {
        await parser.awaitLanguage();
        await parser.awaitWorker();

        const testCode = `
DEFINE VARIABLE x AS INTEGER.
x = 5.
MESSAGE "Hello World" VIEW-AS ALERT-BOX.
        `;

        const fileIdentifier = new FileIdentifier("test.p", 1);

        console.log("Parsing test code...");
        const result = await parser.parse(fileIdentifier, testCode);

        console.log("Parse result:", {
            hasTree: !!result.tree,
            hasRanges: !!result.ranges,
            rangesCount: result.ranges.length,
            rootNodeType: result.tree.rootNode.type,
            hasErrors: result.tree.rootNode.hasError(),
        });

        console.log("Test completed successfully!");
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        if ("dispose" in parser) {
            (parser as any).dispose();
        }
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testIntegratedParser().catch(console.error);
}

export { testIntegratedParser };
