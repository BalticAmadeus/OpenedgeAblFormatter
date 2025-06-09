import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { EOL } from "../model/EOL";
import { OriginalTestCase, TextTree } from "./MG";
import { MR } from "./MR";

export class MetamorphicEngine {
    private formattingEngine: FormattingEngine | undefined = undefined;

    private metamorphicRelations: MR<TextTree>[] = [];
    private inputAndOutputPairs: OriginalTestCase<TextTree>[] = [];

    public setFormattingEngine(formattingEngine: FormattingEngine) {
        this.formattingEngine = formattingEngine;
    }

    public addNameInputAndOutputPair(
        name: string,
        eol: EOL,
        input: TextTree,
        output: TextTree
    ): this {
        console.log("Added test case:", name);
        this.inputAndOutputPairs.push({
            name: name,
            eol: eol,
            input: input,
            output: output,
        });
        return this;
    }

    public addMR(mr: MR<TextTree>): this {
        console.log("Added mr:", mr.mrName);
        this.metamorphicRelations.push(mr);
        return this;
    }

    private test(
        mr: MR<TextTree>,
        pair: OriginalTestCase<TextTree>
    ): undefined | { actual: string; expected: string } {
        if (this.formattingEngine === undefined) {
            throw new Error(
                `Missing Formatting engine in Metamophic test engine.`
            );
        }

        const folowUpInput = mr.inputFunction(pair.input);
        const actualFolowUpOutput = this.formattingEngine.formatText(
            folowUpInput,
            pair.eol,
            false
        );
        const expectedFolowUpOutput = mr.outputFunction(pair.output);

        const result = actualFolowUpOutput === expectedFolowUpOutput;
        return !result
            ? { actual: actualFolowUpOutput, expected: expectedFolowUpOutput }
            : undefined;
        // console.log(
        //     mr.mrName,
        //     pair.name,
        //     "\n---input---\n",
        //     pair.input,
        //     "\n---output---\n",
        //     pair.output,
        //     "\n---folowUpInput---\n",
        //     folowUpInput,
        //     "\n---actualFolowUpOutput---\n",
        //     actualFolowUpOutput,
        //     "\n---expectedFolowUpOutput---\n",
        //     expectedFolowUpOutput,
        //     "\n---INPUT---\n",
        //     "RESULT: " + result
        // );
    }

    public getMatrix(): { fileName: string; mrName: string }[] {
        const matrix: { fileName: string; mrName: string }[] = [];

        this.inputAndOutputPairs.forEach((pair) => {
            this.metamorphicRelations.forEach((mr) => {
                matrix.push({ fileName: pair.name, mrName: mr.mrName });
            });
        });

        return matrix;
    }

    public runOne(
        fileName: string,
        mrName: string
    ): undefined | { actual: string; expected: string } {
        const pair = this.inputAndOutputPairs.find(
            (pair) => pair.name === fileName
        );
        const mr = this.metamorphicRelations.find(
            (relation) => relation.mrName === mrName
        );

        if (!pair) {
            throw new Error(
                `Input/Output pair with fileName "${fileName}" not found.`
            );
        }

        if (!mr) {
            throw new Error(
                `Metamorphic relation with mrName "${mrName}" not found.`
            );
        }

        return this.test(mr, pair);
    }

    public runAll() {
        console.log("runAll");

        this.inputAndOutputPairs.forEach((pair) => {
            this.metamorphicRelations.forEach((mr) => {
                this.test(mr, pair);
            });
        });

        // Clear
        this.inputAndOutputPairs = [];
    }
}
