import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { EOL } from "../model/EOL";
import { BaseEngineOutput, DebugTestingEngineOutput } from "./EngineParams";
import { OriginalTestCase, TextTree } from "./OriginalTestCase";
import { MR } from "./MR";
import { FormattingEngineMock } from "../formatterFramework/FormattingEngineMock";

export class MetamorphicEngine<T extends BaseEngineOutput> {
    private formattingEngine: FormattingEngine | undefined = undefined;
    private proxyFormattingEngine: FormattingEngineMock | undefined = undefined;
    private resultsList: (T | boolean)[] = [];

    private readonly metamorphicRelations: MR[] = [];
    private inputAndOutputPairs: OriginalTestCase[] = [];

    public setFormattingEngine(proxyFormattingEngine: FormattingEngineMock) {
        this.proxyFormattingEngine = proxyFormattingEngine;
    }

    private readonly engineConsole: Console | undefined;

    public constructor(engineConsole: Console | undefined) {
        this.engineConsole = engineConsole;
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
        mrs.forEach((mr) => {
            this.addMR(mr);
        });
    }

    private async test(
        mr: MR,
        pair: OriginalTestCase
    ): Promise<undefined | DebugTestingEngineOutput> {
        if (this.proxyFormattingEngine === undefined) {
            throw new Error(
                `Missing ProxyFormattingEngine in Metamorphic test engine.`
            );
        }

        const folowUpInput = mr.inputFunction(pair.input);
        const actualFolowUpOutput = await this.proxyFormattingEngine.formatText(
            folowUpInput,
            pair.eol,
            false
        );
        const expectedFolowUpOutput = mr.outputFunction(pair.output);

        const pass = actualFolowUpOutput === expectedFolowUpOutput;

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

        this.inputAndOutputPairs.forEach((pair) => {
            this.metamorphicRelations.forEach((mr) => {
                const result = this.test(mr, pair);
                if (result !== undefined) {
                    results.push(result as unknown as T);
                } else {
                    results.push(true);
                }
            });
        });

        // Clear
        this.inputAndOutputPairs = [];
        this.resultsList = this.resultsList.concat(results);

        return results;
    }

    public getResults(): (T | boolean)[] {
        return this.resultsList;
    }
}
