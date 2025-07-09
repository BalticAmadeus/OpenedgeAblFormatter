import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { EOL } from "../model/EOL";
import { BaseEngineOutput, DebugTestingEngineOutput } from "./EngineParams";
import { OriginalTestCase, TextTree } from "./OriginalTestCase";
import { MR } from "./MR";

export class MetamorphicEngine<T extends BaseEngineOutput> {
    private formattingEngine: FormattingEngine | undefined = undefined;

    private readonly metamorphicRelations: MR[] = [];
    private inputAndOutputPairs: OriginalTestCase[] = [];

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

    public addMR(mr: MR): this {
        console.log("Added mr:", mr.mrName);
        this.metamorphicRelations.push(mr);
        return this;
    }

    private test(
        mr: MR,
        pair: OriginalTestCase
    ): undefined | DebugTestingEngineOutput {
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

        const pass = actualFolowUpOutput === expectedFolowUpOutput;

        // console.log(pass ? "PASS -" : "FAIL -", mr.mrName, pair.name);

        return !pass
            ? {
                  fileName: pair.name,
                  mrName: mr.mrName,
                  actual: actualFolowUpOutput,
                  expected: expectedFolowUpOutput,
              }
            : undefined;
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

    public runOne(fileName: string, mrName: string): T | undefined {
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

        const result = this.test(mr, pair);

        return result as T | undefined;
    }

    public runAll(): T[] {
        console.log("runAll");

        let results: T[] = [];

        this.inputAndOutputPairs.forEach((pair) => {
            this.metamorphicRelations.forEach((mr) => {
                const result = this.test(mr, pair);
                if (result !== undefined) {
                    results.push(result as unknown as T);
                }
            });
        });

        // Clear
        this.inputAndOutputPairs = [];

        return results;
    }
}
