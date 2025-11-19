import { EOL } from "../model/EOL";
import { BaseEngineOutput, DebugTestingEngineOutput } from "./EngineParams";
import { OriginalTestCase, TextTree } from "./OriginalTestCase";
import { MR } from "./MR";
import { FormattingEngineMock } from "../formatterFramework/FormattingEngineMock";

export class MetamorphicEngine<T extends BaseEngineOutput> {
    private formattingEngineMock: FormattingEngineMock | undefined = undefined;
    private resultsList: (T | boolean)[] = [];

    private readonly metamorphicRelations: MR[] = [];
    private inputAndOutputPairs: OriginalTestCase[] = [];

    private readonly engineConsole: Console | undefined;

    public constructor(engineConsole: Console | undefined) {
        this.engineConsole = engineConsole;
    }

    public setFormattingEngine(formattingEngineMock: FormattingEngineMock) {
        this.formattingEngineMock = formattingEngineMock;
    }

    public addNameInputAndOutputPair(
        name: string,
        eol: EOL,
        input: TextTree,
        output: TextTree
    ): this {
        this.inputAndOutputPairs.push({
            name: name,
            eol: eol,
            input: input,
            output: output,
        });
        return this;
    }

    public addMR(mr: MR): this {
        this.metamorphicRelations.push(mr);
        return this;
    }

    public addMRs(mrs: MR[]): void {
        for (const mr of mrs) {
            this.addMR(mr);
        }
    }

    private async test(
        mr: MR,
        pair: OriginalTestCase
    ): Promise<undefined | DebugTestingEngineOutput> {
        if (this.formattingEngineMock === undefined) {
            throw new Error(
                `Missing FormattingEngineMock in Metamorphic test engine.`
            );
        }

        const folowUpInput = await mr.inputFunction(pair.input);
        const actualFolowUpOutput = await this.formattingEngineMock.formatText(
            folowUpInput,
            pair.eol,
            false
        );
        const expectedFolowUpOutput = await mr.outputFunction(pair.output);

        const pass = actualFolowUpOutput === expectedFolowUpOutput;

        return pass
            ? undefined
            : {
                  fileName: pair.name,
                  mrName: mr.mrName,
                  actual: actualFolowUpOutput,
                  expected: expectedFolowUpOutput,
              };
    }

    public getMatrix(): { fileName: string; mrName: string }[] {
        const matrix: { fileName: string; mrName: string }[] = [];

        for (const pair of this.inputAndOutputPairs) {
            for (const mr of this.metamorphicRelations) {
                matrix.push({ fileName: pair.name, mrName: mr.mrName });
            }
        }

        return matrix;
    }

    public async runOne(
        fileName: string,
        mrName: string
    ): Promise<T | undefined> {
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

        return (await this.test(mr, pair)) as T | undefined;
    }

    public runAll(): (T | boolean)[] {
        let results: (T | boolean)[] = [];

        for (const pair of this.inputAndOutputPairs) {
            for (const mr of this.metamorphicRelations) {
                const result = this.test(mr, pair);
                if (result === undefined) {
                    results.push(true);
                } else {
                    results.push(result as unknown as T);
                }
            }
        }

        // Clear
        this.inputAndOutputPairs = [];
        this.resultsList = this.resultsList.concat(results);

        return results;
    }

    public getResults(): (T | boolean)[] {
        return this.resultsList;
    }
}
