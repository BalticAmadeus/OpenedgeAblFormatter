import { EndOfLine } from "vscode";

export class EOL {
    public readonly eolDel: string;

    public constructor(vscEOL: EndOfLine | string) {
        if (typeof vscEOL === "string") {
            this.eolDel = vscEOL;
        } else {
            this.eolDel = vscEOL === EndOfLine.LF ? "\n" : "\r\n";
        }
    }
}
