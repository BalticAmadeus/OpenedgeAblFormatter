import * as chai from "chai";
import * as assert from "assert";
import {
    ActivityBar,
    VSBrowser,
    WebDriver,
    EditorView,
    Workbench,
    ViewItem,
    Notification,
    NotificationType,
    TreeItem,
    Key,
} from "vscode-extension-tester";
import { TestList } from "./testList";

enum FileType {
    Source,
    Target,
}

// Create a Mocha suite
describe("My Test Suite", () => {
    let browser: VSBrowser;
    let driver: WebDriver;

    // Get names from enum (filter garbage number values) and put to runs array
    const runs: { it: string }[] = Object.keys(TestList)
        .filter((v) => isNaN(Number(v)))
        .map((fileNam) => {
            return { it: fileNam };
        });

    // Iterate runs and create a test case for each
    runs.forEach((run) => {
        it("Test: " + run.it, async () => {
            const sourceFile = await getFileName(run.it, FileType.Source);
            const targetFile = await getFileName(run.it, FileType.Target);

            if (sourceFile === undefined || targetFile === undefined) {
                assert.fail("Source or Target files were not found");
            }

            await openFile(sourceFile);

            const editorView = new EditorView();

            const workbench = new Workbench();
            await workbench.executeCommand("Format Document");

            const afterText = await (
                await editorView.openEditor(sourceFile)
            ).getText();

            await openFile(targetFile);
            const targetText = await (
                await editorView.openEditor(targetFile)
            ).getText();

            assert.equal(afterText, targetText);
        });
    });

    // initialize the browser and webdriver
    before(async () => {
        browser = VSBrowser.instance;
        driver = browser.driver;

        await browser.openResources(".test_dir/samples");
    });

    async function openFile(fileName: string) {
        const control = await new ActivityBar().getViewControl("Explorer");

        if (control === undefined) {
            return;
        }

        const view = await control.openView().then((view) => {
            return view;
        });

        const section = await view.getContent().getSection("samples");

        await section.openItem(fileName);
    }

    // Renames file in .vscode folder
    async function renameFile(fileName: string, newFileName: string) {
        const control = await new ActivityBar().getViewControl("Explorer");

        if (control === undefined) {
            return;
        }

        const view = await control.openView().then((view) => {
            return view;
        });

        const section = await view.getContent().getSection("samples");
        const visibleItems = await section.getVisibleItems();

        // expand .vscode folder if not expanded already
        for (const item of visibleItems) {
            if ((await item.getText()) === ".vscode") {
                const treeItem = item as TreeItem;
                if ((await treeItem.isExpanded()) === false) {
                    treeItem.expand();
                }
                break;
            }
        }

        // Find file, press rename and send new name
        const visibleFile = await section.findItem(fileName, 2);
        if (visibleFile !== undefined) {
            await visibleFile.select();

            // Get right click menu items
            const menu = await visibleFile.openContextMenu();
            const contextMenus = await menu.getItems();

            for (const contexMenu of contextMenus) {
                if ((await contexMenu.getLabel()) === "Rename...") {
                    await contexMenu.select();

                    /* 
                        WTF WHY control and shift is pressed down
                        This was caused by execute command
                        await workbench.executeCommand("Format Document");
                    */
                    await driver
                        .actions({
                            async: undefined,
                            bridge: undefined,
                        })
                        .keyUp(Key.CONTROL)
                        .keyUp(Key.SHIFT)
                        .sendKeys(newFileName.toString())
                        .sendKeys(Key.ENTER)
                        .perform();

                    break;
                }
            }
        }
    }

    async function getFileName(
        name: string,
        type: FileType
    ): Promise<string | undefined> {
        const control = await new ActivityBar().getViewControl("Explorer");

        if (control === undefined) {
            return undefined;
        }

        const view = await control.openView().then((view) => {
            return view;
        });

        const section = await view.getContent().getSection("samples");
        const files = await section.getVisibleItems();
        const file = await findFile(files, name, type);

        if (file === undefined) {
            return undefined;
        }

        return await file.getText();
    }

    async function findFile(
        files: ViewItem[],
        name: string,
        type: FileType
    ): Promise<ViewItem | undefined> {
        const foundFiles = await Promise.all(
            files.map(async (file) => {
                const fileName = await file.getText();
                return {
                    file,
                    matches:
                        compareName(fileName, name) &&
                        compareType(fileName, type) &&
                        isAblFile(fileName),
                };
            })
        );

        const matchingFile = foundFiles.find(({ matches }) => matches);
        return matchingFile ? matchingFile.file : undefined;
    }

    function compareName(fileName: string, name: string): boolean {
        return fileName.startsWith("target-")
            ? fileName.split(".")[0].split("-")[1].toLowerCase() ===
                  name.toLowerCase()
            : fileName.split(".")[0].toLowerCase() === name.toLowerCase();
    }

    function compareType(fileName: string, type: FileType): boolean {
        return type === FileType.Target
            ? fileName.startsWith("target-")
            : !fileName.startsWith("target-");
    }

    function isAblFile(fileName: string) {
        return (
            fileName.endsWith(".w") ||
            fileName.endsWith(".p") ||
            fileName.endsWith(".cls") ||
            fileName.endsWith(".i")
        );
    }
});
