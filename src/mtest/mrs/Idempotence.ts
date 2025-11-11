import { TextTree } from "../OriginalTestCase";
import { MR } from "../MR";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { FileIdentifier } from "../../model/FileIdentifier";

export class IdempotenceMR implements MR {
    mrName: string = "Idempotence";

    constructor(private parserHelper: AblParserHelper | null) {}

    async inputFunction(input: TextTree): Promise<string> {
        if (!this.parserHelper) {
            throw new Error("ParserHelper is not initialized in IdempotenceMR");
        }
        const eol = this.getEOL(input.text);

        const firstFormat = await this.parserHelper.format(
            new FileIdentifier("idempotence-test", 1),
            input.text,
            { eol: { eolDel: eol } }
        );
        return firstFormat;
    }

    async outputFunction(output: TextTree): Promise<string> {
        return output.text;
    }

    checkIfApplicable(input: TextTree): boolean {
        return true;
    }

    public setParserHelper(parserHelper: AblParserHelper): void {
        this.parserHelper = parserHelper;
    }

    private getEOL(text: string): string {
        if (text.includes("\r\n")) {
            return "\r\n";
        } else if (text.includes("\n")) {
            return "\n";
        }
        return "\n";
    }
}
