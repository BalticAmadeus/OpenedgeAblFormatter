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
import { Telemetry } from "../utils/telemetry";

export class DebugManager implements IDebugManager {
    private static instance: DebugManager;

    private statusBarItem: StatusBarItem;
    private debugModeOverride: boolean = false;
    private debugModeCommandName = "AblFormatter.TurnOnDebugMode";
    private errorRanges: Range[] = [];

    private readonly parserErrorTextDecorationType =
        window.createTextEditorDecorationType({
            backgroundColor: new ThemeColor("errorForeground"),
        });

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
        this.statusBarItem.text = "ABL Formatter • Loading.....";
        this.statusBarItem.show();
        this.statusBarItem.tooltip = "Loading";
        extensionContext.subscriptions.push(this.statusBarItem);

        const commandHandler = () => {
            this.ebnableDebugModeOverride(!this.debugModeOverride);
        };

        extensionContext.subscriptions.push(
            commands.registerCommand(this.debugModeCommandName, commandHandler)
        );
    }

    public handleErrors(tree: Tree): void {
        const nodes = this.getNodesWithErrors(tree.rootNode, true);

        Telemetry.addTreeSitterErrors(nodes.length);
        this.errorRanges = [];

        if (nodes.length > 0) {
            this.statusBarItem.backgroundColor = this.isInDebugMode()
                ? new ThemeColor("statusBarItem.errorBackground")
                : new ThemeColor("statusBarItem.warningBackground");

            this.statusBarItem.text =
                "Abl Formatter • " + nodes.length + " parser Error(s)";

            this.statusBarItem.command =
                this.debugModeOverride || !this.isInDebugMode()
                    ? this.debugModeCommandName
                    : undefined;

            this.statusBarItem.tooltip =
                this.statusBarItem.command === undefined
                    ? this.statusBarItem.tooltip
                    : "Click to " +
                      (this.isInDebugMode() ? "DISABLE" : "ENABLE") +
                      " debug mode \n";

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

            if (this.isInDebugMode()) {
                window.activeTextEditor?.setDecorations(
                    this.parserErrorTextDecorationType,
                    []
                );

                window.activeTextEditor?.setDecorations(
                    this.parserErrorTextDecorationType,
                    this.errorRanges
                );
            }
        } else {
            this.statusBarItem.text = "Abl Formatter • No Parser Errors";
            this.statusBarItem.tooltip = "All good \n";
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.command = undefined;

            window.activeTextEditor?.setDecorations(
                this.parserErrorTextDecorationType,
                []
            );
        }
    }

    public parserReady(): void {
        this.statusBarItem.text = "Abl Formatter • Ready";
        this.statusBarItem.tooltip = this.isInDebugMode()
            ? "In DEBUG mode"
            : "";
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

    private ebnableDebugModeOverride(enable: boolean) {
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

        this.statusBarItem.command = this.debugModeCommandName;
    }

    public isInDebugMode(): boolean {
        return (
            ConfigurationManager.getInstance().get("showTreeInfoOnHover") ===
                true || this.debugModeOverride
        );
    }
}
