import { TextTree } from "../OriginalTestCase";
import { MR } from "../MR";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { format } from "../../utils/suitesUtils";

export class IdempotenceMR implements MR {
    mrName: string = "Idempotence";

    constructor(readonly parserHelper: AblParserHelper | null) {}

    inputFunction(input: TextTree): string {
        if (!this.parserHelper) {
            throw new Error("ParserHelper is not initialized in IdempotenceMR");
        }

        const firstFormat = format(
            input.text,
            "idempotence-test",
            this.parserHelper
        );
        return firstFormat;
    }

    outputFunction(output: TextTree): string {
        return output.text;
    }

    checkIfApplicable(input: TextTree): boolean {
        return true;
    }
}
