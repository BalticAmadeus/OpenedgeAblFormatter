import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function checkDockerDesktopApp(): Promise<void> {
    console.log(
        "======================================================================="
    );
    console.log(
        "-----------------------------------------------------------------------"
    );

    try {
        console.log("Checking if Docker Desktop is running...");
        await execAsync("docker info");
        console.log("✓ Docker Desktop is running and accessible");
    } catch (error) {
        console.error("❌ Docker Desktop is not running or not accessible");
        console.error("Please start Docker Desktop and try again.");
        throw new Error(
            "Docker Desktop is not available. Please start Docker Desktop and ensure it's running properly."
        );
    }
}

async function cloneAdeSourceCode(): Promise<void> {
    console.log(
        "======================================================================="
    );
    console.log(
        "-----------------------------------------------------------------------"
    );
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

async function runPbuildCygwin(): Promise<void> {
    // Get Windows and Cygwin-style directories
    console.log(
        "======================================================================="
    );
    console.log(
        "-----------------------------------------------------------------------"
    );
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
        `pbuild`,
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

async function copyDockerImg(): Promise<void> {
    console.log(
        "======================================================================="
    );
    console.log(
        "-----------------------------------------------------------------------"
    );

    const imageName = "devbfvio/openedge-compiler:latest";

    try {
        console.log(`Checking if Docker image ${imageName} exists...`);
        await execAsync(`docker image inspect ${imageName}`);
        console.log("✓ Docker image already exists, skipping pull");
    } catch (error) {
        console.log("Docker image not found, pulling from registry...");
        try {
            await execAsync(`docker pull ${imageName}`);
            console.log("✓ Docker image pulled successfully");
        } catch (pullError) {
            console.error("Failed to pull Docker image:", pullError);
            throw pullError;
        }
    }
}

async function runPbuildDocker(): Promise<void> {
    console.log(
        "======================================================================="
    );
    console.log(
        "-----------------------------------------------------------------------"
    );

    // Check if container exists and remove it
    try {
        console.log("Checking for existing openedge-compiler container...");
        await execAsync("docker container inspect openedge-compiler");
        console.log("Removing existing openedge-compiler container...");
        await execAsync("docker rm -f openedge-compiler");
        console.log("✓ Existing container removed successfully");
    } catch (error) {
        // Container doesn't exist, which is fine
        console.log("No existing container found, proceeding...");
    }

    // Get dynamic project directory path
    const projectRootDir = path.resolve(__dirname, "../..");
    const adeSourceDir = path.join(
        projectRootDir,
        "resources",
        "ade-sourcecode"
    );

    console.log(`Project root: ${projectRootDir}`);
    console.log(`ADE source directory: ${adeSourceDir}`);

    // Comment out the $RMDIR "$WORK" line in pbuild to preserve working directory
    const pbuildPath = path.join(adeSourceDir, "src", "adebuild", "pbuild");
    try {
        console.log("Modifying pbuild script to preserve working directory...");
        let pbuildContent = fs.readFileSync(pbuildPath, "utf-8");

        // Comment out the last $RMDIR "$WORK" line (the final cleanup at end of script)
        pbuildContent = pbuildContent.replace(
            /(# Remove pbuild working directory\s+)(\$RMDIR "\$WORK")/,
            "$1# $2  # Commented out to preserve working directory"
        );

        fs.writeFileSync(pbuildPath, pbuildContent, "utf-8");
        console.log("✓ pbuild script modified to preserve working directory");
    } catch (error) {
        console.warn("Failed to modify pbuild script:", error);
        // Continue anyway - this is not critical for the build
    }

    // Docker command arguments
    const dockerCommand = "docker";
    const dockerArgs = [
        "run",
        "--name",
        "openedge-compiler",
        "-v",
        `${adeSourceDir}:/app/src`,
        "-v",
        `C:\\Progress\\OpenEdge\\progress.cfg:/usr/dlc/progress.cfg`,
        "devbfvio/openedge-compiler:latest",
        "bash",
        "-c",
        'export POSSE=/app/src && export PATH="$PATH:$POSSE/src/adebuild" && pbuild',
    ];

    console.log(`Running Docker: ${dockerCommand} ${dockerArgs.join(" ")}`);

    return new Promise((resolve, reject) => {
        const proc = spawn(dockerCommand, dockerArgs, {
            stdio: ["ignore", "pipe", "pipe"],
            // Remove shell: true to avoid PowerShell interference
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
            // Container is automatically removed due to --rm flag
            if (code === 0) {
                console.log("✓ Docker build process exited successfully.");
                resolve();
            } else {
                reject(new Error(`Docker build exited with code ${code}`));
            }
        });

        proc.on("error", (err) => {
            // Container is automatically removed due to --rm flag
            reject(err);
        });
    });
}

async function renameFolders(): Promise<void> {
    console.log(
        "======================================================================="
    );
    console.log(
        "-----------------------------------------------------------------------"
    );
    const adeSourcePath = path.resolve(
        __dirname,
        "../../resources/ade-sourceCode"
    );

    const ttyPath = path.join(adeSourcePath, "tty");
    const ttyNotFormattedPath = path.join(adeSourcePath, "ttyNotFormatted");
    const pbuildDirPath = path.join(adeSourcePath, "pbuild.dir");
    const pbuildDirNotFormattedPath = path.join(
        adeSourcePath,
        "pbuild.dirNotFormatted"
    );

    console.log("Checking for tty folder to rename...");

    try {
        // Check if tty folder exists
        if (!fs.existsSync(ttyPath)) {
            console.log("⚠ tty folder not found, skipping tty rename");
        } else {
            // Check if ttyNotFormatted already exists and remove it
            if (fs.existsSync(ttyNotFormattedPath)) {
                console.log("Removing existing ttyNotFormatted folder...");
                fs.rmSync(ttyNotFormattedPath, {
                    recursive: true,
                    force: true,
                });
            }

            // Rename tty to ttyNotFormatted
            console.log("Renaming tty folder to ttyNotFormatted...");
            fs.renameSync(ttyPath, ttyNotFormattedPath);
            console.log("✓ Successfully renamed tty folder to ttyNotFormatted");
        }

        // Check if pbuild.dir folder exists
        console.log("Checking for pbuild.dir folder to rename...");
        if (!fs.existsSync(pbuildDirPath)) {
            console.log(
                "⚠ pbuild.dir folder not found, skipping pbuild.dir rename"
            );
        } else {
            // Check if pbuild.dirNotFormatted already exists and remove it
            if (fs.existsSync(pbuildDirNotFormattedPath)) {
                console.log(
                    "Removing existing pbuild.dirNotFormatted folder..."
                );
                fs.rmSync(pbuildDirNotFormattedPath, {
                    recursive: true,
                    force: true,
                });
            }

            // Rename pbuild.dir to pbuild.dirNotFormatted
            console.log(
                "Renaming pbuild.dir folder to pbuild.dirNotFormatted..."
            );
            fs.renameSync(pbuildDirPath, pbuildDirNotFormattedPath);
            console.log(
                "✓ Successfully renamed pbuild.dir folder to pbuild.dirNotFormatted"
            );
        }

        // Check if at least one folder was processed
        if (
            !fs.existsSync(ttyNotFormattedPath) &&
            !fs.existsSync(pbuildDirNotFormattedPath)
        ) {
            console.log("⚠ No folders were found to rename");
        }
    } catch (error) {
        console.error("Failed to rename folders:", error);
        throw error;
    }
}

async function formatAdeSrc(): Promise<void> {
    console.log(
        "======================================================================="
    );
    console.log(
        "-----------------------------------------------------------------------"
    );
    const adeSourcePath = path.resolve(
        __dirname,
        "../../resources/ade-sourceCode/src"
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

async function compareResults(): Promise<void> {
    console.log(
        "======================================================================="
    );
    console.log(
        "-----------------------------------------------------------------------"
    );
    const adeSourcePath = path.resolve(
        __dirname,
        "../../resources/ade-sourceCode"
    );

    const ttyPath = path.join(adeSourcePath, "tty");
    const ttyNotFormattedPath = path.join(adeSourcePath, "ttyNotFormatted");
    const pbuildDirPath = path.join(adeSourcePath, "pbuild.dir");
    const pbuildDirNotFormattedPath = path.join(
        adeSourcePath,
        "pbuild.dirNotFormatted"
    );
    // Create output directory and timestamped filename
    const outputDir = path.join(__dirname, "../../out/compilation-test");
    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .split(".")[0];
    const compareResultsPath = path.join(
        outputDir,
        `compareResults_${timestamp}.txt`
    );

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log("Comparing TTY and pbuild.dir folders...");

    // Helper function to recursively get all files in a directory
    const getAllFiles = (
        dirPath: string,
        basePath: string = dirPath
    ): string[] => {
        let results: string[] = [];

        if (!fs.existsSync(dirPath)) {
            return results;
        }

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.relative(basePath, fullPath);

            if (entry.isDirectory()) {
                // Recursively get files from subdirectories
                results = results.concat(getAllFiles(fullPath, basePath));
            } else if (entry.isFile()) {
                results.push(relativePath);
            }
        }

        return results;
    };

    // Initialize results file
    let resultsContent = `Comparison Results - ${new Date().toISOString()}\n`;
    resultsContent += `=======================================================\n\n`;

    try {
        // Compare TTY folders
        const ttyExists = fs.existsSync(ttyPath);
        const ttyNotFormattedExists = fs.existsSync(ttyNotFormattedPath);

        if (ttyExists && ttyNotFormattedExists) {
            console.log("Scanning tty folders...");
            const ttyFiles = getAllFiles(ttyPath);
            const ttyNotFormattedFiles = getAllFiles(ttyNotFormattedPath);

            // Convert to sets for easier comparison
            const ttyFileSet = new Set(ttyFiles);
            const ttyNotFormattedFileSet = new Set(ttyNotFormattedFiles);

            // Find files that exist only in tty
            const onlyInTty = ttyFiles.filter(
                (file) => !ttyNotFormattedFileSet.has(file)
            );

            // Find files that exist only in ttyNotFormatted
            const onlyInTtyNotFormatted = ttyNotFormattedFiles.filter(
                (file) => !ttyFileSet.has(file)
            );

            // Find common files
            const ttyCommonFiles = ttyFiles.filter((file) =>
                ttyNotFormattedFileSet.has(file)
            );

            // Write TTY mismatch files to results
            resultsContent += `=== TTY FOLDER COMPARISON ===\n`;
            resultsContent += `Files only in tty (${onlyInTty.length}):\n`;
            onlyInTty.forEach((f) => {
                resultsContent += `   -ttySrcOnly : ${f}\n`;
            });

            resultsContent += `\nFiles only in ttyNotFormatted (${onlyInTtyNotFormatted.length}):\n`;
            onlyInTtyNotFormatted.forEach((f) => {
                resultsContent += `   -ttyNotFormattedOnly : ${f}\n`;
            });
            resultsContent += `\n`;

            // Console log only summary
            console.log(`📊 TTY Comparison Results:`);
            console.log(
                `   Total files in ttyNotFormatted: ${ttyNotFormattedFiles.length}`
            );
            console.log(`   Total files in tty: ${ttyFiles.length}`);
            console.log(`   Common files: ${ttyCommonFiles.length}`);
        } else {
            console.log("⚠ TTY folders not available for comparison");
            resultsContent += `=== TTY FOLDER COMPARISON ===\n`;
            resultsContent += `TTY folders not available for comparison\n\n`;
        }

        // Compare pbuild.dir folders
        const pbuildDirExists = fs.existsSync(pbuildDirPath);
        const pbuildDirNotFormattedExists = fs.existsSync(
            pbuildDirNotFormattedPath
        );

        if (pbuildDirExists && pbuildDirNotFormattedExists) {
            console.log("Scanning pbuild.dir folders...");
            const pbuildDirFiles = getAllFiles(pbuildDirPath);
            const pbuildDirNotFormattedFiles = getAllFiles(
                pbuildDirNotFormattedPath
            );

            // Convert to sets for easier comparison
            const pbuildDirFileSet = new Set(pbuildDirFiles);
            const pbuildDirNotFormattedFileSet = new Set(
                pbuildDirNotFormattedFiles
            );

            // Find files that exist only in pbuild.dir
            const onlyInPbuildDir = pbuildDirFiles.filter(
                (file) => !pbuildDirNotFormattedFileSet.has(file)
            );

            // Find files that exist only in pbuild.dirNotFormatted
            const onlyInPbuildDirNotFormatted =
                pbuildDirNotFormattedFiles.filter(
                    (file) => !pbuildDirFileSet.has(file)
                );

            // Find common files
            const pbuildCommonFiles = pbuildDirFiles.filter((file) =>
                pbuildDirNotFormattedFileSet.has(file)
            );

            // Write pbuild.dir mismatch files to results
            resultsContent += `=== PBUILD.DIR FOLDER COMPARISON ===\n`;
            resultsContent += `Files only in pbuild.dir (${onlyInPbuildDir.length}):\n`;
            onlyInPbuildDir.forEach((f) => {
                resultsContent += `   -pbuildDirOnly : ${f}\n`;
            });

            resultsContent += `\nFiles only in pbuild.dirNotFormatted (${onlyInPbuildDirNotFormatted.length}):\n`;
            onlyInPbuildDirNotFormatted.forEach((f) => {
                resultsContent += `   -pbuildDirNotFormattedOnly : ${f}\n`;
            });
            resultsContent += `\n`;

            // Console log only summary
            console.log(`📊 pbuild.dir Comparison Results:`);
            console.log(
                `   Total files in pbuild.dirNotFormatted: ${pbuildDirNotFormattedFiles.length}`
            );
            console.log(
                `   Total files in pbuild.dir: ${pbuildDirFiles.length}`
            );
            console.log(`   Common files: ${pbuildCommonFiles.length}`);
        } else {
            console.log("⚠ pbuild.dir folders not available for comparison");
            resultsContent += `=== PBUILD.DIR FOLDER COMPARISON ===\n`;
            resultsContent += `pbuild.dir folders not available for comparison\n\n`;
        }

        // Write results to file
        fs.writeFileSync(compareResultsPath, resultsContent, "utf-8");
        console.log(
            `\n✓ Detailed comparison results written to: ${compareResultsPath}`
        );
    } catch (error) {
        console.error("Failed to compare folders:", error);
        throw error;
    }
}

async function main() {
    try {
        // await runPbuildCygwin();
        // await checkDockerDesktopApp();
        // await copyDockerImg();
        await cloneAdeSourceCode();
        // await runPbuildDocker();
        // await renameFolders();
        // await formatAdeSrc();
        // await runPbuildDocker();
        // await compareResults();
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
