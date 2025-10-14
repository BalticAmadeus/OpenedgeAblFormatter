// OpenEdge ABL Formatter - Compilation Tests
// This test suite validates that the formatter doesn't break OpenEdge compilation

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { spawn } from "child_process";
import { promisify } from "util";
import * as readline from "readline";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { FormattingEngine } from "../../formatterFramework/FormattingEngine";
import { ConfigurationManager } from "../../utils/ConfigurationManager";
import Parser from "web-tree-sitter";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import { DebugManagerMock } from "./DebugManagerMock";
import { EOL } from "../../model/EOL";

const execAsync = promisify(exec);

async function promptForProgressCfgPath(): Promise<string> {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log("\n⚠️  Could not automatically find progress.cfg file.");
        console.log("Please provide the full path to your progress.cfg file:");
        console.log("Example: C:\\Progress\\OpenEdge\\progress.cfg");
        console.log("Example: C:\\someFolder\\folder\\progress.cfg");

        rl.question("Enter full path to progress.cfg: ", (userPath) => {
            rl.close();

            if (!userPath.trim()) {
                reject(
                    new Error(
                        "No path provided. Please enter a valid path to progress.cfg"
                    )
                );
                return;
            }

            const trimmedPath = userPath.trim();

            // Validate that the file exists
            if (!fs.existsSync(trimmedPath)) {
                reject(
                    new Error(
                        `File not found: ${trimmedPath}. Please check the path and try again.`
                    )
                );
                return;
            }

            // Validate that it's actually a progress.cfg file
            if (!trimmedPath.toLowerCase().endsWith("progress.cfg")) {
                reject(
                    new Error(
                        `Invalid file: ${trimmedPath}. Please provide path to progress.cfg file.`
                    )
                );
                return;
            }

            console.log(`✓ Using progress.cfg from: ${trimmedPath}`);
            resolve(trimmedPath);
        });
    });
}

async function findProgressCfg(): Promise<string> {
    const commonPaths = [
        "C:\\Progress\\OpenEdge\\progress.cfg",
        "C:\\Progress\\OpenEdge 12.8\\progress.cfg",
        "C:\\Progress\\OpenEdge 12.7\\progress.cfg",
        "C:\\Progress\\OpenEdge 12.6\\progress.cfg",
        "C:\\Progress\\OpenEdge 12.5\\progress.cfg",
        "C:\\Progress\\OpenEdge 12.4\\progress.cfg",
        "C:\\Progress\\OpenEdge 12.3\\progress.cfg",
        "C:\\Progress\\OpenEdge 12.2\\progress.cfg",
        "C:\\Progress\\OpenEdge 12.1\\progress.cfg",
        "C:\\Progress\\OpenEdge 12.0\\progress.cfg",
        "C:\\Progress\\OpenEdge 11.7\\progress.cfg",
        "C:\\Progress\\OpenEdge 11.6\\progress.cfg",
        "C:\\OpenEdge\\progress.cfg",
        "C:\\dlc\\progress.cfg",
    ];

    console.log("Searching for progress.cfg file...");

    for (const configPath of commonPaths) {
        if (fs.existsSync(configPath)) {
            console.log(`✓ Found progress.cfg at: ${configPath}`);
            return configPath;
        }
    }

    // Check if DLC environment variable is set
    const dlcPath = process.env.DLC;
    if (dlcPath) {
        const configPath = path.join(dlcPath, "progress.cfg");
        if (fs.existsSync(configPath)) {
            console.log(
                `✓ Found progress.cfg via DLC environment variable: ${configPath}`
            );
            return configPath;
        }
    }

    // If not found anywhere, prompt user for manual input
    console.log("❌ Could not find progress.cfg in any standard locations:");
    commonPaths.forEach((p) => console.log(`   - ${p}`));
    console.log(`   - DLC environment variable (${dlcPath || "not set"})`);

    try {
        return await promptForProgressCfgPath();
    } catch (error) {
        throw new Error(
            `Failed to locate progress.cfg file: ${
                error instanceof Error ? error.message : error
            }`
        );
    }
}

async function checkDockerDesktopApp(): Promise<void> {
    console.log("Checking if Docker Desktop is running...");
    try {
        await execAsync("docker info");
        console.log("✓ Docker Desktop is running and accessible");
    } catch (error) {
        console.error("❌ Docker Desktop is not running or not accessible");
        throw new Error(
            "Docker Desktop is not available. Please start Docker Desktop and ensure it's running properly."
        );
    }
}

async function copyDockerImg(): Promise<void> {
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

async function cloneAdeSourceCode(): Promise<void> {
    const targetPath = path.resolve(
        __dirname,
        "../../../resources/ade-sourceCode"
    );

    console.log("Checking for ADE-Sourcecode repository...");

    if (fs.existsSync(targetPath)) {
        console.log("Removing existing ADE-Sourcecode directory...");
        fs.rmSync(targetPath, { recursive: true, force: true });
    }

    console.log("Cloning ADE-Sourcecode repository...");

    try {
        const cloneCommand = `git clone https://github.com/GytRag/ADE-Sourcecode "${targetPath}"`;
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

async function runPbuildDocker(): Promise<void> {
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
    const projectRootDir = path.resolve(__dirname, "../../..");
    const adeSourceDir = path.join(
        projectRootDir,
        "resources",
        "ade-sourcecode"
    );

    console.log(`Project root: ${projectRootDir}`);
    console.log(`ADE source directory: ${adeSourceDir}`);

    // Find progress.cfg file automatically
    const progressCfgPath = await findProgressCfg();

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
        `${progressCfgPath}:/usr/dlc/progress.cfg`,
        "devbfvio/openedge-compiler:latest",
        "bash",
        "-c",
        'export POSSE=/app/src && export PATH="$PATH:$POSSE/src/adebuild" && pbuild',
    ];

    console.log(`Running Docker: ${dockerCommand} ${dockerArgs.join(" ")}`);

    return new Promise((resolve, reject) => {
        const proc = spawn(dockerCommand, dockerArgs, {
            stdio: ["ignore", "pipe", "pipe"],
        });

        // Print real-time stdout and stderr
        proc.stdout.setEncoding("utf8");
        proc.stderr.setEncoding("utf8");

        proc.stdout.on("data", (data: string) => {
            process.stdout.write(data);
        });

        proc.stderr.on("data", (data: string) => {
            process.stderr.write(data);
        });

        proc.on("close", (code) => {
            if (code === 0) {
                console.log("✓ Docker build process exited successfully.");
                resolve();
            } else {
                reject(new Error(`Docker build exited with code ${code}`));
            }
        });

        proc.on("error", (err) => {
            reject(err);
        });
    });
}

async function renameFolders(): Promise<void> {
    const adeSourcePath = path.resolve(
        __dirname,
        "../../../resources/ade-sourceCode"
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
    const adeSourcePath = path.resolve(
        __dirname,
        "../../../resources/ade-sourceCode/src"
    );

    console.log("Formatting ADE source code files...");

    if (!fs.existsSync(adeSourcePath)) {
        console.log("⚠ ADE source directory not found, skipping formatting");
        return;
    }

    // Create output directory and timestamped filename for format failures
    const outputDir = path.join(
        __dirname,
        "../../../resources/testResults/compilationTests"
    );
    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .split(".")[0];
    const formatFailsPath = path.join(
        outputDir,
        `formatFails_${timestamp}.txt`
    );

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Initialize format failures log
    let formatFailures: string[] = [];
    formatFailures.push(`Format Failures Log - ${new Date().toISOString()}`);
    formatFailures.push(
        `=======================================================\n`
    );

    try {
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

        // Initialize parser
        await Parser.init();

        // Initialize configuration and parser helper (like in stability tests)
        const configurationManager = ConfigurationManager.getInstance();
        enableFormatterDecorators(); // This is crucial for formatter initialization!

        const debugManager = new DebugManagerMock();
        const parserHelper = new AblParserHelper(
            __dirname + "/../../../",
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
                                    new EOL(detectedEOL)
                                );

                                // Write formatted content back to file
                                fs.writeFileSync(
                                    fullPath,
                                    formattedContent,
                                    "utf-8"
                                );

                                filesFormatted++;
                            } catch (error) {
                                const errorMessage =
                                    error instanceof Error
                                        ? error.message
                                        : String(error);
                                const relativePath = path.relative(
                                    adeSourcePath,
                                    fullPath
                                );
                                const failureEntry = `${relativePath}: ${errorMessage}`;

                                console.warn(
                                    `Failed to format ${relativePath}: ${errorMessage}`
                                );
                                formatFailures.push(failureEntry);
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

        // Write format failures to file
        if (formatFailures.length > 2) {
            // More than just header lines
            formatFailures.push(`\nSummary:`);
            formatFailures.push(`Total files formatted: ${filesFormatted}`);
            formatFailures.push(`Total files failed: ${filesSkipped}`);

            fs.writeFileSync(
                formatFailsPath,
                formatFailures.join("\n"),
                "utf-8"
            );
            console.log(`📄 Format failures logged to: ${formatFailsPath}`);
        } else {
            console.log("✓ No formatting failures to log");
        }

        console.log(
            `✓ Formatting complete: ${filesFormatted} files formatted, ${filesSkipped} files skipped`
        );
    } catch (error) {
        console.error("Failed to format ADE source files:", error);
        throw error;
    }
}

async function compareResults(): Promise<string> {
    const adeSourcePath = path.resolve(
        __dirname,
        "../../../resources/ade-sourceCode"
    );

    const ttyPath = path.join(adeSourcePath, "tty");
    const ttyNotFormattedPath = path.join(adeSourcePath, "ttyNotFormatted");
    const pbuildDirPath = path.join(adeSourcePath, "pbuild.dir");
    const pbuildDirNotFormattedPath = path.join(
        adeSourcePath,
        "pbuild.dirNotFormatted"
    );

    // Create output directory and timestamped filename
    const outputDir = path.join(
        __dirname,
        "../../../resources/testResults/compilationTests"
    );
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
    let resultsContent = `Compilation Test Results - ${new Date().toISOString()}\n`;
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

            // Write TTY results
            resultsContent += `=== TTY FOLDER COMPARISON ===\n`;
            resultsContent += `Files only in tty (${onlyInTty.length}):\n`;
            onlyInTty.forEach((f) => {
                resultsContent += `   +tty: ${f}\n`;
            });

            resultsContent += `\nFiles only in ttyNotFormatted (${onlyInTtyNotFormatted.length}):\n`;
            onlyInTtyNotFormatted.forEach((f) => {
                resultsContent += `   -ttyNotFormatted: ${f}\n`;
            });
            resultsContent += `\nCommon files: ${ttyCommonFiles.length}\n\n`;

            // Add summary to file
            resultsContent += `📊 TTY Comparison Results:\n`;
            resultsContent += `   All files in tty: ${ttyFiles.length}\n`;
            resultsContent += `   Files only in tty: ${onlyInTty.length}\n`;
            resultsContent += `   All files in ttyNotFormatted: ${ttyNotFormattedFiles.length}\n`;
            resultsContent += `   Files only in ttyNotFormatted: ${onlyInTtyNotFormatted.length}\n\n`;

            // Console log summary
            console.log(`📊 TTY Comparison Results:`);
            console.log(`   All files in tty: ${ttyFiles.length}`);
            console.log(`   Files only in tty: ${onlyInTty.length}`);
            console.log(
                `   All files in ttyNotFormatted: ${ttyNotFormattedFiles.length}`
            );
            console.log(
                `   Files only in ttyNotFormatted: ${onlyInTtyNotFormatted.length}`
            );
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

            // Find differences
            const onlyInPbuildDir = pbuildDirFiles.filter(
                (file) => !pbuildDirNotFormattedFileSet.has(file)
            );

            const onlyInPbuildDirNotFormatted =
                pbuildDirNotFormattedFiles.filter(
                    (file) => !pbuildDirFileSet.has(file)
                );

            const pbuildCommonFiles = pbuildDirFiles.filter((file) =>
                pbuildDirNotFormattedFileSet.has(file)
            );

            // Write pbuild.dir results
            resultsContent += `=== PBUILD.DIR FOLDER COMPARISON ===\n`;
            resultsContent += `Files only in pbuild.dir (${onlyInPbuildDir.length}):\n`;
            onlyInPbuildDir.forEach((f) => {
                resultsContent += `   +pbuild.dir: ${f}\n`;
            });

            resultsContent += `\nFiles only in pbuild.dirNotFormatted (${onlyInPbuildDirNotFormatted.length}):\n`;
            onlyInPbuildDirNotFormatted.forEach((f) => {
                resultsContent += `   -pbuild.dirNotFormatted: ${f}\n`;
            });
            resultsContent += `\nCommon files: ${pbuildCommonFiles.length}\n\n`;

            // Add summary to file
            resultsContent += `📊 pbuild.dir Comparison Results:\n`;
            resultsContent += `   All files in pbuild.dir: ${pbuildDirFiles.length}\n`;
            resultsContent += `   Files only in pbuild.dir: ${onlyInPbuildDir.length}\n`;
            resultsContent += `   All files in pbuild.dirNotFormatted: ${pbuildDirNotFormattedFiles.length}\n`;
            resultsContent += `   Files only in pbuild.dirNotFormatted: ${onlyInPbuildDirNotFormatted.length}\n\n`;

            // Console log summary
            console.log(`📊 pbuild.dir Comparison Results:`);
            console.log(`   All files in pbuild.dir: ${pbuildDirFiles.length}`);
            console.log(
                `   Files only in pbuild.dir: ${onlyInPbuildDir.length}`
            );
            console.log(
                `   All files in pbuild.dirNotFormatted: ${pbuildDirNotFormattedFiles.length}`
            );
            console.log(
                `   Files only in pbuild.dirNotFormatted: ${onlyInPbuildDirNotFormatted.length}`
            );
            console.log(`   Common files: ${pbuildCommonFiles.length}`);
        } else {
            console.log("⚠ pbuild.dir folders not available for comparison");
            resultsContent += `=== PBUILD.DIR FOLDER COMPARISON ===\n`;
            resultsContent += `pbuild.dir folders not available for comparison\n\n`;
        }

        // Write results to file
        fs.writeFileSync(compareResultsPath, resultsContent, "utf-8");

        return compareResultsPath;
    } catch (error) {
        console.error("Failed to compare folders:", error);
        throw error;
    }
}

suite("Compilation Tests", function () {
    // Increase timeout for Docker operations
    this.timeout(3600000); // 60 minutes

    suiteTeardown(() => {
        vscode.window.showInformationMessage(
            "✓ Full compilation test completed."
        );
    });

    suiteSetup(async () => {
        await checkDockerDesktopApp();
        await copyDockerImg();
        await cloneAdeSourceCode();
    });

    test("Should run pbuild in Docker (unformatted)", async function () {
        await runPbuildDocker();

        // Verify that build outputs exist
        const adeSourcePath = path.resolve(
            __dirname,
            "../../../resources/ade-sourceCode"
        );

        // At least one of these should exist after pbuild
        const ttyPath = path.join(adeSourcePath, "tty");
        const pbuildDirPath = path.join(adeSourcePath, "pbuild.dir");

        const hasOutput =
            fs.existsSync(ttyPath) || fs.existsSync(pbuildDirPath);
        assert.ok(hasOutput, "pbuild should produce tty or pbuild.dir output");

        // Rename folders for comparison after successful build
        await renameFolders();
    });

    test("Should format ADE source files", async function () {
        await formatAdeSrc();

        // Verify formatting was applied - check that source files still exist
        const adeSourcePath = path.resolve(
            __dirname,
            "../../../resources/ade-sourceCode/src"
        );
        assert.ok(
            fs.existsSync(adeSourcePath),
            "ADE source directory should still exist after formatting"
        );
    });

    test("Should run pbuild again (formatted)", async function () {
        await runPbuildDocker();

        // Verify that build outputs exist after formatting
        const adeSourcePath = path.resolve(
            __dirname,
            "../../../resources/ade-sourceCode"
        );

        const ttyPath = path.join(adeSourcePath, "tty");
        const pbuildDirPath = path.join(adeSourcePath, "pbuild.dir");

        const hasOutput =
            fs.existsSync(ttyPath) || fs.existsSync(pbuildDirPath);
        assert.ok(hasOutput, "pbuild should produce output after formatting");
    });

    test("Should compare compilation results", async function () {
        const resultFile = await compareResults();

        // Verify comparison results file was created
        assert.ok(
            fs.existsSync(resultFile),
            "Comparison results file should be created"
        );

        // Verify the file has content
        const content = fs.readFileSync(resultFile, "utf-8");
        assert.ok(content.length > 0, "Comparison results should have content");
        assert.ok(
            content.includes("Compilation Test Results"),
            "Results should be properly formatted"
        );
    });
});
