import * as vscode from "vscode";
import Parser from "web-tree-sitter";
import { AblFormatterProvider } from "./providers/AblFormatterProvider";
import { Constants } from "./model/Constants";
import { AblParserHelper } from "./parser/AblParserHelper";
import { AblDebugHoverProvider } from "./providers/AblDebugHoverProvider";
import { ConfigurationManager } from "./utils/ConfigurationManager";
import { enableFormatterDecorators } from "./formatterFramework/enableFormatterDecorators";
import { DebugManager } from "./providers/DebugManager";
import { MetamorphicEngine } from "./mtest/MetamorphicEngine";
import { Telemetry } from "./utils/Telemetry";
import { ReplaceEQ } from "./mtest/mrs/ReplaceEQ";
import { ReplaceForEachToForLast } from "./mtest/mrs/ReplaceForEachToForLast";
import { RemoveNoError } from "./mtest/mrs/RemoveNoError";
import { BaseEngineOutput } from "./mtest/EngineParams";
import { lt } from "semver";
import { FormatterPreviewPanel } from "./providers/FormatterPreviewPanel";
import { FormatterPreviewProvider } from "./providers/FormatterPreviewProvider";

const WEBINAR_INFO_URL =
    "https://github.com/BalticAmadeus/OpenedgeAblFormatter/discussions/682";
const WEBINAR_DATE_LABEL = "April 30th";

const metamorphicTestingEngine = new MetamorphicEngine<BaseEngineOutput>(
    undefined //no excessive logging
);

// Add a type-safe global declaration for the extension context
declare global {
    var __ablFormatterExtensionContext: vscode.ExtensionContext | undefined;
}

export async function activate(context: vscode.ExtensionContext) {
    const debugManager = DebugManager.getInstance(context);
    const showPromotionalNotifications = vscode.workspace
        .getConfiguration("AblFormatter")
        .get<boolean>("showPromotionalNotifications", true);

    if (lt(vscode.version, "1.107.0")) {
        debugManager.disableExtension();
        return;
    }

    await Parser.init().then(() => {});

    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    context.subscriptions.push(Telemetry.getInstance());

    const parserHelper = new AblParserHelper(
        context.extensionPath,
        debugManager
    );

    const metamorphicRelationsList = [
        new ReplaceEQ(),
        new ReplaceForEachToForLast(),
        new RemoveNoError(),
    ];
    metamorphicTestingEngine.addMRs(metamorphicRelationsList);

    vscode.window.onDidChangeActiveTextEditor(() => {
        if (debugManager) {
            debugManager.handleErrorRanges([]);
        }
    });

    const formatter = new AblFormatterProvider(
        parserHelper,
        metamorphicTestingEngine
    );

    vscode.languages.registerDocumentRangeFormattingEditProvider(
        Constants.ablId,
        formatter
    );

    vscode.languages.registerDocumentFormattingEditProvider(
        Constants.ablId,
        formatter
    );

    const hoverProvider = new AblDebugHoverProvider(parserHelper);
    vscode.languages.registerHoverProvider(Constants.ablId, hoverProvider);
    Telemetry.sendExtensionSettings();

    const excludeCodeCommand = vscode.commands.registerCommand(
        "openedgeAblFormatter.excludeCode",
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const selection = editor.selection;

            if (selection.isEmpty) {
                vscode.window.showInformationMessage(
                    "Please select a block of code to exclude."
                );
                return;
            }

            const selectedText = editor.document.getText(selection);

            const newText =
                `@AblFormatterExcludeStart.\n` +
                selectedText +
                `\n@AblFormatterExcludeEnd.`;

            await editor.edit((editBuilder) => {
                editBuilder.replace(selection, newText);
            });
        }
    );
    context.subscriptions.push(excludeCodeCommand);

    const previewProvider = new FormatterPreviewProvider();
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(
            "abl-preview",
            previewProvider
        )
    );

    const openSettingsPreviewCommand = vscode.commands.registerCommand(
        "openedgeAblFormatter.openSettingsPreview",
        () => {
            FormatterPreviewPanel.createOrShow(
                vscode.Uri.file(context.extensionPath),
                parserHelper,
                previewProvider
            );
        }
    );
    context.subscriptions.push(openSettingsPreviewCommand);

    const previewCommand = vscode.commands.registerCommand(
        "openedgeAblFormatter.openFormatterPreview",
        () => {
            FormatterPreviewPanel.createOrShow(
                vscode.Uri.file(context.extensionPath),
                parserHelper,
                previewProvider
            );
        }
    );
    context.subscriptions.push(previewCommand);

    setInterval(runPeriodicTask, 20_000);

    const reportBugCommand = vscode.commands.registerCommand(
        "openedgeAblFormatter.reportBug",
        () => {
            vscode.env.openExternal(
                vscode.Uri.parse(
                    "https://github.com/BalticAmadeus/OpenedgeAblFormatter/issues/new?template=formatter-bug-report.md"
                )
            );
        }
    );
    context.subscriptions.push(reportBugCommand);

    const webinarInfoCommand = vscode.commands.registerCommand(
        "openedgeAblFormatter.openWebinarInfo",
        () => {
            vscode.env.openExternal(vscode.Uri.parse(WEBINAR_INFO_URL));
        }
    );
    context.subscriptions.push(webinarInfoCommand);

    const bugStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        99
    );

    bugStatusBarItem.text = "$(bug) ABL Formatter: Report Bug";
    bugStatusBarItem.command = "openedgeAblFormatter.reportBug";
    bugStatusBarItem.tooltip =
        "Report a bug or issue for OpenEdge ABL Formatter";
    bugStatusBarItem.show();
    context.subscriptions.push(bugStatusBarItem);

    if (showPromotionalNotifications) {
        const webinarStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            98
        );
        webinarStatusBarItem.text = "$(megaphone) Webinar: Apr 30";
        webinarStatusBarItem.command = "openedgeAblFormatter.openWebinarInfo";
        webinarStatusBarItem.tooltip =
            `Join our free OpenEdge ABL Formatter webinar on ${WEBINAR_DATE_LABEL}`;
        webinarStatusBarItem.show();
        context.subscriptions.push(webinarStatusBarItem);
    }

    // Pass context down to test suites via global or export
    globalThis.__ablFormatterExtensionContext = context;

    // Show setup prompt once when ABL file is opened for the first time after install
    const SETUP_PROMPT_SHOWN_KEY = "openedgeAblFormatter.setupPromptShown";
    if (!context.globalState.get(SETUP_PROMPT_SHOWN_KEY)) {
        let promptShowing = false;
        
        const showSetupPrompt = async () => {
            if (promptShowing) {
                return;
            }
            promptShowing = true;
            
            const result = await vscode.window.showInformationMessage(
                "Would you like to configure ABL Formatter settings?",
                "Configure Settings",
                "Don't Show Again"
            );
            
            promptShowing = false;
            
            if (result === "Configure Settings") {
                FormatterPreviewPanel.createOrShow(
                    vscode.Uri.file(context.extensionPath),
                    parserHelper,
                    previewProvider
                );
                await context.globalState.update(SETUP_PROMPT_SHOWN_KEY, true);
            } else if (result === "Don't Show Again") {
                await context.globalState.update(SETUP_PROMPT_SHOWN_KEY, true);
            }
            // If dismissed (result undefined), don't mark as shown - it will appear again
        };

        // Check if an ABL file is already open
        if (vscode.window.activeTextEditor?.document.languageId === Constants.ablId) {
            showSetupPrompt();
        }
        
        // Listen for ABL file opens (keep listening until user makes a choice)
        const disposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor?.document.languageId === Constants.ablId) {
                if (!context.globalState.get(SETUP_PROMPT_SHOWN_KEY)) {
                    showSetupPrompt();
                } else {
                    disposable.dispose();
                }
            }
        });
        context.subscriptions.push(disposable);
    }

    // Show one-time promo popup for upcoming webinar.
    const WEBINAR_PROMO_SHOWN_KEY =
        "openedgeAblFormatter.webinarPromoApril302026Shown";
    if (
        showPromotionalNotifications &&
        !context.globalState.get(WEBINAR_PROMO_SHOWN_KEY)
    ) {
        const result = await vscode.window.showInformationMessage(
            `Join our FREE OpenEdge ABL Formatter webinar on ${WEBINAR_DATE_LABEL}. Live demo, setup walkthrough, and Q&A with developer Gustas.`,
            "Follow Webinar Updates",
            "Dismiss"
        );

        if (result === "Follow Webinar Updates") {
            await vscode.env.openExternal(vscode.Uri.parse(WEBINAR_INFO_URL));
        }

        await context.globalState.update(WEBINAR_PROMO_SHOWN_KEY, true);
    }
}

function runPeriodicTask() {
    const resultList = metamorphicTestingEngine.runAll();
    let numOfFails = 0;

    resultList.forEach((result) => {
        if (result !== true) {
            numOfFails++;
            console.log("Fail", (result as BaseEngineOutput).mrName);
        }
    });

    if (resultList.length > 0) {
        console.log(
            "Num of test cases",
            resultList.length,
            ". Pass rate %",
            ((resultList.length - numOfFails) / resultList.length) * 100
        );
    } else {
        console.log("Nothing to test");
    }
}

// This method is called when your extension is deactivated
export function deactivate() {
    //do nothing
}
