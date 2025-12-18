import * as vscode from "vscode";

export class FormatterPreviewProvider
    implements vscode.TextDocumentContentProvider
{
    private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private _content: string = "";
    readonly onDidChange = this._onDidChange.event;

    setContent(content: string) {
        this._content = content;
        this._onDidChange.fire(vscode.Uri.parse("abl-preview://preview"));
    }

    provideTextDocumentContent(uri: vscode.Uri): string {
        return this._content;
    }
}
