import {
    commands,
    ExtensionContext,
    Range,
    StatusBarAlignment,
    StatusBarItem,
    ThemeColor,
    window,
} from "vscode";
import { SyntaxNode, Tree } from "web-tree-sitter";
import { SyntaxNodeType } from "../model/SyntaxNodeType";
import { ConfigurationManager } from "../utils/ConfigurationManager";
import { IDebugManager } from "./IDebugManager";
import { Telemetry } from "../utils/Telemetry";

export class DebugManager implements IDebugManager {
    private static instance: DebugManager;

    private statusBarItem: StatusBarItem;
    private debugModeOverride: boolean = false;
    private debugModeCommandName = "AblFormatter.TurnOnDebugMode";
    private errorRanges: Range[] = [];

    private readonly parserErrorTextDecorationType =
        window.createTextEditorDecorationType({
            backgroundColor: "rgba(255, 238, 0, 0.25)",
        });

    private parserHelper?: {
        startWorker: () => Promise<void>;
        dispose: () => void;
    };

    public static getInstance(
        extensionContext?: ExtensionContext
    ): DebugManager {
        if (!DebugManager.instance && extensionContext !== undefined) {
            if (extensionContext === undefined) {
                throw Error("No Context");
            }

            DebugManager.instance = new DebugManager(extensionContext);
        }
        return DebugManager.instance;
    }

    private constructor(extensionContext: ExtensionContext) {
        this.statusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Right,
            101
        );
        this.statusBarItem.text = "ABL Formatter • Ready";
        this.statusBarItem.show();
        this.statusBarItem.tooltip =
            "No parser errors. Click to ENABLE debug mode.";
        this.statusBarItem.command = this.debugModeCommandName;
        extensionContext.subscriptions.push(this.statusBarItem);

        const commandHandler = async () => {
            this.enableDebugModeOverride(!this.debugModeOverride);
        };

        extensionContext.subscriptions.push(
            commands.registerCommand(this.debugModeCommandName, commandHandler)
        );
    }

    public handleErrors(tree: Tree): void {
        const nodes = this.getNodesWithErrors(tree.rootNode, true);

        Telemetry.addTreeSitterErrors(nodes.length);
        this.errorRanges = [];
        nodes.forEach((node) => {
            this.errorRanges.push(
                new Range(
                    node.startPosition.row,
                    node.startPosition.column,
                    node.endPosition.row,
                    node.endPosition.column
                )
            );
        });

        this.updateStatusBar();

        // Show decorations according to debug mode
        if (this.isInDebugMode()) {
            window.activeTextEditor?.setDecorations(
                this.parserErrorTextDecorationType,
                this.errorRanges
            );
        } else {
            window.activeTextEditor?.setDecorations(
                this.parserErrorTextDecorationType,
                []
            );
        }
    }

    public handleErrorRanges(ranges: Range[]): void {
        this.errorRanges = ranges;
        this.updateStatusBar();
        // Show decorations according to debug mode
        if (this.isInDebugMode()) {
            window.activeTextEditor?.setDecorations(
                this.parserErrorTextDecorationType,
                this.errorRanges
            );
        } else {
            window.activeTextEditor?.setDecorations(
                this.parserErrorTextDecorationType,
                []
            );
        }
    }

    private updateStatusBar(): void {
        if (this.errorRanges.length > 0) {
            // There are parser errors
            if (this.isInDebugMode()) {
                this.statusBarItem.backgroundColor = new ThemeColor(
                    "statusBarItem.errorBackground"
                );
                this.statusBarItem.tooltip = `${this.errorRanges.length} parser error(s) detected.\nClick to DISABLE debug mode.`;
            } else {
                this.statusBarItem.backgroundColor = new ThemeColor(
                    "statusBarItem.warningBackground"
                );
                this.statusBarItem.tooltip = `${this.errorRanges.length} parser error(s) detected.\nClick to ENABLE debug mode.`;
            }
            this.statusBarItem.text = `Abl Formatter • ${this.errorRanges.length} parser Error(s)`;
        } else {
            // No errors
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.text = "Abl Formatter • Ready";
            this.statusBarItem.tooltip = `No parser errors.\nClick to ${
                this.isInDebugMode() ? "DISABLE" : "ENABLE"
            } debug mode.`;
        }
        this.statusBarItem.command = this.debugModeCommandName;
        this.statusBarItem.show();
    }

    public parserReady(): void {
        this.updateStatusBar();
    }

    public fileFormattedSuccessfully(numOfEdits: number): void {
        this.statusBarItem.tooltip =
            this.statusBarItem.tooltip +
            "" +
            numOfEdits +
            " formatting edits were made";
    }

    private getNodesWithErrors(
        node: SyntaxNode,
        isRoot: boolean
    ): SyntaxNode[] {
        let errorNodes: SyntaxNode[] = [];

        if (
            node.type === SyntaxNodeType.Error &&
            node.text.trim() !== "ERROR" &&
            !isRoot
        ) {
            errorNodes.push(node);
        }

        node.children.forEach((child) => {
            errorNodes = errorNodes.concat(
                this.getNodesWithErrors(child, false)
            );
        });

        return errorNodes;
    }

    private enableDebugModeOverride(enable: boolean) {
        this.debugModeOverride = enable;
        this.statusBarItem.backgroundColor = enable
            ? new ThemeColor("statusBarItem.errorBackground")
            : new ThemeColor("statusBarItem.warningBackground");

        this.statusBarItem.tooltip =
            "Click to " +
            (this.isInDebugMode() ? "DISABLE" : "ENABLE") +
            " debug mode \n";

        if (enable) {
            window.activeTextEditor?.setDecorations(
                this.parserErrorTextDecorationType,
                this.errorRanges
            );
        } else {
            window.activeTextEditor?.setDecorations(
                this.parserErrorTextDecorationType,
                []
            );
        }

        this.updateStatusBar();
    }

    public setParserHelper(parserHelper: {
        startWorker: () => Promise<void>;
        dispose: () => void;
    }) {
        this.parserHelper = parserHelper;
    }

    public isInDebugMode(): boolean {
        return this.debugModeOverride;
    }

    public isShowTreeOnHover(): boolean {
        return (
            ConfigurationManager.getInstance().get("showTreeInfoOnHover") ===
                true || this.isInDebugMode()
        );
    }

    public disableExtension(): void {
        this.statusBarItem.text = "ABL Formatter • Disabled";
        this.statusBarItem.backgroundColor = new ThemeColor(
            "statusBarItem.warningBackground"
        );
        this.statusBarItem.show();
    }
}
