import { OriginalTestCase, MG } from "./MG";
import { ReplaceEQsMR } from "./ReplaceEQsMR";

export class MGBuilder {
    static build(): MG<string>[] {
        const name = "My Testulis";
        const input = "if a eq b then return b = c.";
        const output = "if a eq b\nthen return b = c."; //from formatting

        let inputAndFolowUpPairs: OriginalTestCase<string>[] = [];
        inputAndFolowUpPairs.push({
            name: name,
            input: input,
            output: output,
        });
        const myMG = new MG(inputAndFolowUpPairs, new ReplaceEQsMR());

        return [myMG];
    }

    static buildOneFromInputAndOutput(
        name: string,
        input: string,
        output: string
    ): MG<string> {
        let inputAndFolowUpPairs: OriginalTestCase<string>[] = [];
        inputAndFolowUpPairs.push({
            name: name,
            input: input,
            output: output,
        });
        const myMG = new MG(inputAndFolowUpPairs, new ReplaceEQsMR());

        return myMG;
    }
}
