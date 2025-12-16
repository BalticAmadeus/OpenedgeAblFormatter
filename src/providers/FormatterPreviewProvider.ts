import * as vscode from "vscode";

export class FormatterPreviewProvider implements vscode.TextDocumentContentProvider {
    private _content: string = "";
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this._onDidChange.event;

    setContent(content: string) {
        this._content = content;
        this._onDidChange.fire(vscode.Uri.parse("abl-preview://preview"));
    }

    provideTextDocumentContent(uri: vscode.Uri): string {
        return this._content;
    }
}