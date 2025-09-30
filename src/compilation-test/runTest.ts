import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function cloneAdeSourceCode(): Promise<void> {
    const targetPath = path.resolve(
        __dirname,
        "../../resources/ade-sourceCode"
    );

    console.log("Checking for ADE-Sourcecode repository...");

    if (fs.existsSync(targetPath)) {
        console.log("Removing existing ADE-Sourcecode directory...");
        fs.rmSync(targetPath, { recursive: true, force: true });
    }

    console.log("Cloning ADE-Sourcecode repository...");

    try {
        const cloneCommand = `git clone https://github.com/consultingwerk/ADE-Sourcecode "${targetPath}"`;
        const { stdout, stderr } = await execAsync(cloneCommand);

        if (stderr && !stderr.includes("Cloning into")) {
            throw new Error(`Git clone failed: ${stderr}`);
        }

        console.log("✓ ADE-Sourcecode repository cloned successfully");
    } catch (error) {
        console.error("Failed to clone ADE-Sourcecode repository:", error);
        throw error;
    }
}

async function runPbuildWithTempEnv(): Promise<void> {
    // Get Windows and Cygwin-style directories
    const winProjectDir = path.resolve(
        __dirname,
        "../../resources/ade-sourceCode"
    );
    const cygProjectDir = winProjectDir
        .replace(/\\/g, "/")
        .replace(/^([A-Z]):/i, (_, d) => `/cygdrive/${d.toLowerCase()}`);

    const cygwinBashPath = "C:\\cygwin64\\bin\\bash.exe";
    // For current run only: set env vars in the shell for this process
    const bashCommand = [
        `export POSSE='${cygProjectDir}'`,
        `export PATH="$PATH:$POSSE/src/adebuild"`,
        "which pbuild",
        "pbuild uimode=gui apps=aderesc",
    ].join("; ");

    console.log(`Running: ${bashCommand}`);
    const args = ["-l", "-c", bashCommand];

    return new Promise((resolve, reject) => {
        const proc = spawn(cygwinBashPath, args, {
            cwd: winProjectDir,
            stdio: ["ignore", "pipe", "pipe"],
        });

        // Print real-time stdout and stderr
        proc.stdout.setEncoding("utf8");
        proc.stderr.setEncoding("utf8");

        proc.stdout.on("data", (data: string) => {
            process.stdout.write(data); // live output
        });

        proc.stderr.on("data", (data: string) => {
            process.stderr.write(data); // live errors
        });

        proc.on("close", (code) => {
            if (code === 0) {
                console.log("✓ Build process exited successfully.");
                resolve();
            } else {
                reject(new Error(`Build exited with code ${code}`));
            }
        });

        proc.on("error", (err) => {
            reject(err);
        });
    });
}

async function renameGuiFolder(): Promise<void> {
    const adeSourcePath = path.resolve(
        __dirname,
        "../../resources/ade-sourceCode"
    );

    const guiPath = path.join(adeSourcePath, "gui");
    const guiOriginalPath = path.join(adeSourcePath, "guiOriginal");

    console.log("Checking for gui folder to rename...");

    try {
        // Check if gui folder exists
        if (!fs.existsSync(guiPath)) {
            console.log("⚠ gui folder not found, skipping rename");
            return;
        }

        // Check if guiOriginal already exists and remove it
        if (fs.existsSync(guiOriginalPath)) {
            console.log("Removing existing guiOriginal folder...");
            fs.rmSync(guiOriginalPath, { recursive: true, force: true });
        }

        // Rename gui to guiOriginal
        console.log("Renaming gui folder to guiOriginal...");
        fs.renameSync(guiPath, guiOriginalPath);

        console.log("✓ Successfully renamed gui folder to guiOriginal");
    } catch (error) {
        console.error("Failed to rename gui folder:", error);
        throw error;
    }
}

async function formatAdeSrc(): Promise<void> {
    const adeSourcePath = path.resolve(
        __dirname,
        "../../resources/ade-sourceCode/src/aderesc"
    );

    console.log("Formatting ADE source code files...");

    if (!fs.existsSync(adeSourcePath)) {
        console.log("⚠ ADE source directory not found, skipping formatting");
        return;
    }

    try {
        // Import required modules for formatting
        const { AblParserHelper } = require("../parser/AblParserHelper");
        const {
            FormattingEngine,
        } = require("../formatterFramework/FormattingEngine");
        const { FileIdentifier } = require("../model/FileIdentifier");
        const { DebugManagerMock } = require("../test/suite/DebugManagerMock");
        const {
            enableFormatterDecorators,
        } = require("../formatterFramework/enableFormatterDecorators");
        const Parser = require("web-tree-sitter");

        // Create a standalone EOL class that doesn't depend on vscode
        class StandaloneEOL {
            public readonly eolDel: string;

            public constructor(eolString: string = "\r\n") {
                this.eolDel = eolString;
            }
        }

        // Function to detect EOL from file content (like in the test suites)
        function getFileEOL(fileText: string): string {
            if (fileText.includes("\r\n")) {
                return "\r\n";
            } else if (fileText.includes("\n")) {
                return "\n";
            } else if (fileText.includes("\r")) {
                return "\r";
            }
            return "\r\n"; // Default to Windows EOL
        }

        // Create a standalone configuration manager that doesn't depend on vscode
        class StandaloneConfigurationManager {
            private defaultSettings: { [key: string]: any } = {
                // Enable all formatters with default settings
                assignFormatting: true,
                assignFormattingAssignLocation: "New",
                assignFormattingAlignRightExpression: "Yes",
                assignFormattingEndDotLocation: "New aligned",
                findFormatting: true,
                forFormatting: true,
                caseFormatting: true,
                caseFormattingThenLocation: "Same",
                caseFormattingDoLocation: "Same",
                caseFormattingStatementLocation: "New",
                blockFormatting: true,
                ifFormatting: true,
                ifFormattingThenLocation: "Same",
                ifFormattingDoLocation: "Same",
                ifFormattingStatementLocation: "Same",
                temptableFormatting: true,
                usingFormatting: true,
                bodyFormatting: true,
                propertyFormatting: true,
                ifFunctionFormatting: true,
                ifFunctionFormattingAddParentheses: "No",
                ifFunctionFormattingElseLocation: "Same",
                enumFormatting: true,
                enumFormattingEndDotLocation: "Same",
                variableDefinitionFormatting: true,
                procedureParameterFormatting: true,
                functionParameterFormatting: true,
                functionParameterFormattingAlignParameterTypes: "Yes",
                arrayAccessFormatting: true,
                arrayAccessFormattingAddSpaceAfterComma: "Yes",
                expressionFormatting: true,
                expressionFormattingLogicalLocation: "New",
                statementFormatting: true,
                variableAssignmentFormatting: true,
                showTreeInfoOnHover: false,
            };
            private tabSize = 4;
            private overridingSettings: any = undefined;

            get(name: string): any {
                if (
                    this.overridingSettings &&
                    this.overridingSettings[name] !== undefined
                ) {
                    return this.overridingSettings[name];
                }
                return this.defaultSettings[name] !== undefined
                    ? this.defaultSettings[name]
                    : false;
            }

            getTabSize(): any {
                return this.tabSize;
            }

            getCasing(): any {
                return false; // Default casing setting
            }

            setOverridingSettings(settings: any): void {
                this.overridingSettings = settings;
            }

            setTabSize(size: number): void {
                this.tabSize = size;
            }
        }

        // Initialize parser
        await Parser.init();

        // Initialize configuration and parser helper (like in stability tests)
        const configurationManager = new StandaloneConfigurationManager();
        enableFormatterDecorators(); // This is crucial for formatter initialization!

        const debugManager = new DebugManagerMock();
        const parserHelper = new AblParserHelper(
            __dirname + "/../../",
            debugManager
        );

        // Wait for parser to be fully loaded (like in stability tests)
        await parserHelper.awaitLanguage();

        // ABL file extensions to format
        const ablExtensions = [".p", ".i", ".cls", ".w"];
        let filesFormatted = 0;
        let filesSkipped = 0;

        // Recursive function to find and format ABL files
        const formatDirectory = async (dirPath: string): Promise<void> => {
            try {
                const entries = fs.readdirSync(dirPath, {
                    withFileTypes: true,
                });

                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);

                    if (entry.isDirectory()) {
                        // Recursively process subdirectories
                        await formatDirectory(fullPath);
                    } else if (entry.isFile()) {
                        const extension = path
                            .extname(entry.name)
                            .toLowerCase();

                        if (ablExtensions.includes(extension)) {
                            try {
                                console.log(
                                    `Formatting: ${path.relative(
                                        adeSourcePath,
                                        fullPath
                                    )}`
                                );

                                // Read file content
                                const content = fs.readFileSync(
                                    fullPath,
                                    "utf-8"
                                );

                                // Create formatting engine
                                const formatter = new FormattingEngine(
                                    parserHelper,
                                    new FileIdentifier(fullPath, 1),
                                    configurationManager,
                                    debugManager
                                );

                                // Format the content (using detected EOL like stability tests)
                                const detectedEOL = getFileEOL(content);
                                const formattedContent = formatter.formatText(
                                    content,
                                    new StandaloneEOL(detectedEOL)
                                );

                                // Write formatted content back to file
                                fs.writeFileSync(
                                    fullPath,
                                    formattedContent,
                                    "utf-8"
                                );

                                filesFormatted++;
                            } catch (error) {
                                console.warn(
                                    `Failed to format ${fullPath}: ${error}`
                                );
                                filesSkipped++;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(
                    `Error processing directory ${dirPath}: ${error}`
                );
            }
        };

        await formatDirectory(adeSourcePath);
        console.log(
            `✓ Formatting complete: ${filesFormatted} files formatted, ${filesSkipped} files skipped`
        );
    } catch (error) {
        console.error("Failed to format ADE source files:", error);
        throw error;
    }
}

async function main() {
    try {
        await cloneAdeSourceCode();

        await runPbuildWithTempEnv();

        await renameGuiFolder();

        await formatAdeSrc();

        await runPbuildWithTempEnv();
    } catch (err) {
        console.error("Failed to run compilation tests", err);
        process.exit(1);
    }
}

// Export for programmatic use
export { main as runCompilationTest };

// Run if this file is executed directly
if (require.main === module) {
    main();
}
