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

let expectedFiles: string[] = [];
let createdFiles: Set<string> = new Set();
let testRunDir: string = "";
let knownFailures: string[] = [];

suite("Compilation Tests", function () {
    // Increase timeout for Docker operations
    this.timeout(3600000); // 60 minutes

    suiteTeardown(() => {
        vscode.window.showInformationMessage(
            "✓ Full compilation test completed."
        );
    });

    suiteSetup(async () => {
        const extensionDevelopmentPath = path.resolve(__dirname, "../../../");
        knownFailures = getFailedTestCases(
            path.join(extensionDevelopmentPath, "resources/compilationTests")
        );
        console.log(
            `📋 Loaded ${knownFailures.length} known compilation failures`
        );

        await checkDockerDesktopApp();
        await copyDockerImg();
        await cloneAdeSourceCode();
        await formatAdeSrc();
        await runPbuildDocker();
        testRunDir = await createResultsFolder();
        await createTempTxt();
        await loadTestFiles();
    });

    // Load expected files to generate tests
    const compilatedFilesPath = path.resolve(
        __dirname,
        "../../../resources/compilationTests/_compilatedFiles.txt"
    );

    const expectedFilesContent = fs.readFileSync(compilatedFilesPath, "utf-8");
    const testFiles = expectedFilesContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    console.log(`Generating ${testFiles.length} individual compilation tests`);

    // Generate individual test for each expected file
    testFiles.forEach((expectedFile) => {
        test(`Compilation test: ${expectedFile}`, () => {
            compilationTest(expectedFile, createdFiles);
        });
    });
});

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

async function createTempTxt(): Promise<void> {
    const startDir = path.resolve(
        __dirname,
        "../../../resources/ade-sourceCode/pbuild.dir"
    );
    const timestamp = new Date()
        .toLocaleString("lt-LT", {
            timeZone: "Europe/Vilnius",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        })
        .replace(/[\/\s:]/g, "_");
    const outputFile = path.resolve(
        __dirname,
        `../../../resources/ade-sourceCode/_formattedCompFiles.txt`
    );

    let results: string[] = [];

    async function walk(dir: string): Promise<void> {
        try {
            const list = await fs.promises.readdir(dir);

            for (const file of list) {
                const fullPath = path.join(dir, file);
                const relPath = path.relative(startDir, fullPath);

                try {
                    const stat = await fs.promises.stat(fullPath);

                    if (stat.isDirectory()) {
                        await walk(fullPath);
                    } else if (stat.isFile()) {
                        // Only process files ending with '.r'
                        if (file.endsWith(".r")) {
                            // Normalize path separators to underscore
                            const normalized = relPath
                                .replace(/\\/g, "_")
                                .replace(/\//g, "_");
                            results.push(normalized);
                        }
                    }
                } catch (statError) {
                    console.warn(
                        `Could not stat file ${fullPath}: ${statError}`
                    );
                }
            }
        } catch (error) {
            console.warn(`Could not read directory ${dir}: ${error}`);
        }
    }

    try {
        // Check if source directory exists
        if (!fs.existsSync(startDir)) {
            console.warn(`Source directory does not exist: ${startDir}`);
            return;
        }

        // Ensure output directory exists
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            await fs.promises.mkdir(outputDir, { recursive: true });
        }

        // Start walking
        await walk(startDir);

        // Write to file asynchronously
        await fs.promises.writeFile(outputFile, results.join("\n"), "utf-8");
        console.log(`✓ Wrote ${results.length} .r file names to ${outputFile}`);
    } catch (error) {
        console.error(`Failed to create temp file: ${error}`);
        throw error;
    }
}

async function createResultsFolder(): Promise<string> {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../../");
    const testResultsDir = path.join(
        extensionDevelopmentPath,
        "resources/testResults/compilationTests"
    );

    const testRunTimestamp = new Date()
        .toLocaleString("lt-LT", {
            timeZone: "Europe/Vilnius",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        })
        .replace(/[\/\s:]/g, "_");

    const testRunDir = path.join(testResultsDir, testRunTimestamp);

    fs.mkdirSync(testRunDir, { recursive: true });
    return testRunDir;
}

async function loadTestFiles(): Promise<void> {
    // Load expected files after setup is complete
    const compilatedFilesPath = path.resolve(
        __dirname,
        "../../../resources/compilationTests/_compilatedFiles.txt"
    );

    if (!fs.existsSync(compilatedFilesPath)) {
        throw new Error("_compilatedFiles.txt should exist");
    }

    const expectedFilesContent = fs.readFileSync(compilatedFilesPath, "utf-8");
    expectedFiles = expectedFilesContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    console.log(
        `Found ${expectedFiles.length} expected files in _compilatedFiles.txt`
    );

    // Load created temp files after setup is complete
    const createdTempFilePath = path.resolve(
        __dirname,
        "../../../resources/ade-sourceCode/_formattedCompFiles.txt"
    );

    if (!fs.existsSync(createdTempFilePath)) {
        throw new Error(
            `Created temp file should exist at ${createdTempFilePath}`
        );
    }

    const createdFilesContent = fs.readFileSync(createdTempFilePath, "utf-8");
    createdFiles = new Set(
        createdFilesContent
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
    );

    console.log(`Found ${createdFiles.size} files in created temp file`);
}

function getFailedTestCases(filePath: string): string[] {
    const failedFilePath = path.join(filePath, "_failures.txt");

    // Check if the file exists to avoid errors
    if (!fs.existsSync(failedFilePath)) {
        console.log("Known Failures file does not exist!");
        return [];
    }

    // Read the file and split lines into an array
    const data = fs.readFileSync(failedFilePath, "utf8");
    const failures = data
        .split("\n")
        .filter((line) => line.trim() !== "" && !line.trim().startsWith("//"));

    console.log("Known failures list has ", failures.length, "cases");

    return failures;
}

function addFailedTestCase(
    filePath: string,
    fileName: string,
    failedCase: string
): void {
    const failedFilePath = path.join(filePath, fileName);

    // Append the failed test case to the file with a newline
    fs.appendFileSync(failedFilePath, failedCase + "\n", "utf8");
}

function compilationTest(
    expectedFile: string,
    createdFiles: Set<string>
): void {
    // Check if the expected file exists in the created files set
    if (!createdFiles.has(expectedFile)) {
        // Check if this is a known failure
        if (knownFailures.includes(expectedFile)) {
            console.log(`Known compilation issue: ${expectedFile}`);
            return; // Skip the failure - it's expected
        }

        // This is a NEW failure - record it and fail the test
        addFailedTestCase(testRunDir, "_failures.txt", expectedFile);

        assert.fail(
            `Expected file not found in compiled results: ${expectedFile}`
        );
    }

    // Regression detection: if test passes but file was marked as failing
    if (knownFailures.includes(expectedFile)) {
        addFailedTestCase(testRunDir, "_new_passes.txt", expectedFile);

        assert.fail(
            `File should fail but compilation succeeded: ${expectedFile}`
        );
    }
}
