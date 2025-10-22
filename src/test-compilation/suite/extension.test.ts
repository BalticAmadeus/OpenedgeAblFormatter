// OpenEdge ABL Formatter - Compilation Tests
// This test suite validates that the formatter doesn't break OpenEdge compilation

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { spawn } from "child_process";
import { promisify } from "util";
import * as readline from "readline";
import * as vscode from "vscode";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";
import { ConfigurationManager } from "../../utils/ConfigurationManager";
import Parser from "web-tree-sitter";
import { enableFormatterDecorators } from "../../formatterFramework/enableFormatterDecorators";
import { DebugManagerMock } from "./DebugManagerMock";
import { EOL } from "../../model/EOL";

const execAsync = promisify(exec);

// Global path variables
const extensionDevelopmentPath = path.resolve(__dirname, "../../../");
const adeSourceCodePath = path.resolve(
    __dirname,
    "../../../resources/ade-sourceCode"
);
const adeSourcePath = path.join(adeSourceCodePath, "src");
const srcBeforePath = path.join(adeSourceCodePath, "src_before");
const pbuildDirPath = path.join(adeSourceCodePath, "pbuild.dir");
const pbuildPath = path.join(adeSourceCodePath, "src", "adebuild", "pbuild");
const compilatedFilesPath = path.resolve(
    __dirname,
    "../../../resources/compilationTests/_compilatedFiles.txt"
);
const formattedCompFilesPath = path.resolve(
    __dirname,
    "../../../resources/ade-sourceCode/_formattedCompFiles.txt"
);
const testResultsDir = path.join(
    extensionDevelopmentPath,
    "resources/testResults/compilationTests"
);
const compilationTestsPath = path.join(
    extensionDevelopmentPath,
    "resources/compilationTests"
);

const knownFailures: string[] = getFailedTestCases(compilationTestsPath);
console.log(`📋 Loaded ${knownFailures.length} known compilation failures`);

let expectedFiles: string[] = [];
let createdFiles: Set<string> = new Set();
let testRunDir: string = "";

let parserHelper: AblParserHelper;

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
        await copySrcBefor();
        await formatAdeSrc();
        await runPbuildDocker();
        testRunDir = await createResultsFolder();
        await createFormattedCompFilesTxt();
        await loadTestFiles();
    });

    // Load expected files to generate tests
    const expectedFilesContent = fs.readFileSync(compilatedFilesPath, "utf-8");
    const testFiles = expectedFilesContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    console.log(`Generating ${testFiles.length} individual compilation tests`);

    // Generate individual test for each expected file
    testFiles.forEach((expectedFile) => {
        test(`Compilation test: ${expectedFile}`, async () => {
            await compilationTest(expectedFile, createdFiles);
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
    console.log("Checking for ADE-Sourcecode repository...");

    if (fs.existsSync(adeSourceCodePath)) {
        console.log("Removing existing ADE-Sourcecode directory...");
        fs.rmSync(adeSourceCodePath, { recursive: true, force: true });
    }

    console.log("Cloning ADE-Sourcecode repository...");

    try {
        const cloneCommand = `git clone https://github.com/GytRag/ADE-Sourcecode "${adeSourceCodePath}"`;
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

    console.log(`Project root: ${extensionDevelopmentPath}`);
    console.log(`ADE source directory: ${adeSourceCodePath}`);

    // Find progress.cfg file automatically
    const progressCfgPath = await findProgressCfg();

    // Comment out the $RMDIR "$WORK" line in pbuild to preserve working directory
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
        `${adeSourceCodePath}:/app/src`,
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
    console.log("Formatting ADE source code files...");

    if (!fs.existsSync(adeSourcePath)) {
        console.log("⚠ ADE source directory not found, skipping formatting");
        return;
    }

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

        // Initialize configuration and parser helper
        const configurationManager = ConfigurationManager.getInstance();
        enableFormatterDecorators(); // This is crucial for formatter initialization!

        const debugManager = new DebugManagerMock();
        parserHelper = new AblParserHelper(
            __dirname + "/../../../",
            debugManager
        );

        // Start the worker process for parserHelper
        await parserHelper.startWorker();

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

                                // Format the content using parserHelper (worker-based)
                                const formattedContent =
                                    await parserHelper.format(
                                        new FileIdentifier(fullPath, 1),
                                        content,
                                        { eol: { eolDel: getFileEOL(content) } }
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

                                console.warn(
                                    `Failed to format ${relativePath}: ${errorMessage}`
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

async function collectRFilesFromPath(
    currentDir: string,
    results: string[],
    baseDir: string = currentDir
): Promise<void> {
    try {
        const list = await fs.promises.readdir(currentDir);

        for (const file of list) {
            const fullPath = path.join(currentDir, file);
            const relPath = path.relative(baseDir, fullPath);

            try {
                const stat = await fs.promises.stat(fullPath);

                if (stat.isDirectory()) {
                    await collectRFilesFromPath(fullPath, results, baseDir);
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
                console.warn(`Could not stat file ${fullPath}: ${statError}`);
            }
        }
    } catch (error) {
        console.warn(`Could not read directory ${currentDir}: ${error}`);
    }
}

async function createFormattedCompFilesTxt(): Promise<void> {
    const startDir = pbuildDirPath;
    const outputFile = formattedCompFilesPath;

    let results: string[] = [];

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

        // Start collecting .r files
        await collectRFilesFromPath(startDir, results);

        // Write to file asynchronously
        await fs.promises.writeFile(outputFile, results.join("\n"), "utf-8");
        console.log(`✓ Wrote ${results.length} .r file names to ${outputFile}`);
    } catch (error) {
        console.error(`Failed to create temp file: ${error}`);
        throw error;
    }
}

async function createResultsFolder(): Promise<string> {
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

    if (!fs.existsSync(formattedCompFilesPath)) {
        throw new Error(
            `Created temp file should exist at ${formattedCompFilesPath}`
        );
    }

    const createdFilesContent = fs.readFileSync(
        formattedCompFilesPath,
        "utf-8"
    );
    createdFiles = new Set(
        createdFilesContent
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
    );

    console.log(`Found ${createdFiles.size} files in created temp file`);
}

async function copySrcBefor(): Promise<void> {
    console.log("Creating backup copy of ADE source files...");

    if (!fs.existsSync(adeSourcePath)) {
        console.log("⚠ ADE source directory not found, skipping backup");
        return;
    }

    try {
        // Remove existing backup if it exists
        if (fs.existsSync(srcBeforePath)) {
            console.log("Removing existing src_before backup...");
            fs.rmSync(srcBeforePath, { recursive: true, force: true });
        }

        // Use fs.cp for recursive copy (Node.js 16.7.0+)
        await fs.promises.cp(adeSourcePath, srcBeforePath, {
            recursive: true,
            preserveTimestamps: true,
        });

        console.log("✓ Successfully created backup of ADE source files");
    } catch (error) {
        console.error("Failed to create backup of ADE source files:", error);
        throw error;
    }
}

async function copyFailedFiles(failedRFile: string): Promise<void> {
    try {
        // Convert .r file path back to original source path
        // Example: "folder_subfolder_abc.r" -> "folder/subfolder/abc" (without extension)
        // Handle double underscores: "adedict_DB__connect.r" -> "adedict/DB/_connect"
        const baseFileName = failedRFile.replace(/\.r$/, "");

        // Split the filename into parts, handling double underscores correctly
        // Double underscore __ represents a single underscore _ in the filename
        const parts = baseFileName.split("_");
        const processedParts: string[] = [];

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            // Check if this is an empty part (happens with consecutive underscores)
            if (part === "" && i < parts.length - 1) {
                // This empty part is from double underscore __
                // The next part should get a leading underscore
                const nextPart = parts[i + 1];
                if (nextPart !== undefined) {
                    processedParts.push("_" + nextPart);
                    i++; // Skip the next part since we processed it
                }
            } else if (part !== "") {
                // Regular non-empty part
                processedParts.push(part);
            }
        }

        const baseSourcePath = processedParts.join(path.sep);

        // Create normalized filename for test results (replace path separators with underscores)
        const normalizedName = processedParts.join("_");

        console.log(`📋 Copying failed file artifacts for: ${failedRFile}`);

        // Try all common OpenEdge extensions
        const extensions = [".p", ".w", ".i", ".cls"];
        let found = false;

        for (const ext of extensions) {
            const afterFilePath = path.join(
                adeSourcePath,
                baseSourcePath + ext
            );
            const beforeFilePath = path.join(
                srcBeforePath,
                baseSourcePath + ext
            );

            // Check if this extension exists in either location
            if (fs.existsSync(afterFilePath) || fs.existsSync(beforeFilePath)) {
                console.log(`   🔍 Found files with extension: ${ext}`);

                // Copy the "after" version (formatted file)
                if (fs.existsSync(afterFilePath)) {
                    const afterDestPath = path.join(
                        testRunDir,
                        `${normalizedName}_after${ext}`
                    );
                    await fs.promises.copyFile(afterFilePath, afterDestPath);
                    console.log(`   ✓ Copied after: ${afterDestPath}`);
                } else {
                    console.warn(`   ⚠ After file not found: ${afterFilePath}`);
                }

                // Copy the "before" version (original file)
                if (fs.existsSync(beforeFilePath)) {
                    const beforeDestPath = path.join(
                        testRunDir,
                        `${normalizedName}_before${ext}`
                    );
                    await fs.promises.copyFile(beforeFilePath, beforeDestPath);
                    console.log(`   ✓ Copied before: ${beforeDestPath}`);
                } else {
                    console.warn(
                        `   ⚠ Before file not found: ${beforeFilePath}`
                    );
                }

                found = true;
                break; // Stop after finding the first matching extension
            }
        }

        if (!found) {
            console.warn(
                `   ⚠ Could not find source files for: ${failedRFile}`
            );
            console.warn(`   ⚠ Tried extensions: ${extensions.join(", ")}`);
            console.warn(`   ⚠ Base path: ${baseSourcePath}`);
        }
    } catch (error) {
        console.error(`Failed to copy artifacts for ${failedRFile}:`, error);
    }
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

async function compilationTest(
    expectedFile: string,
    createdFiles: Set<string>
): Promise<void> {
    // Check if the expected file exists in the created files set
    if (!createdFiles.has(expectedFile)) {
        // Check if this is a known failure
        if (knownFailures.includes(expectedFile)) {
            console.log(`Known compilation issue: ${expectedFile}`);
            return; // Skip the failure - it's expected
        }

        // This is a NEW failure - record it and fail the test
        addFailedTestCase(testRunDir, "_failures.txt", expectedFile);

        // Copy before/after files for debugging
        await copyFailedFiles(expectedFile);

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
