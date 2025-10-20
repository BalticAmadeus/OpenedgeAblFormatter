import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { EOL } from "../model/EOL";
import { BaseEngineOutput, DebugTestingEngineOutput } from "./EngineParams";
import { OriginalTestCase, TextTree } from "./OriginalTestCase";
import { MR } from "./MR";

type FormatFunction<T> = (input: string, eol: EOL) => T;

export class MetamorphicEngine<T> {
    private formattingEngine: FormattingEngine | undefined = undefined;
    private customFormatFunction: FormatFunction<T> | undefined = undefined;
    private resultsList: (
        | T
        | boolean
        | { actual: T; expected: T; fileName: string; mrName: string }
    )[] = [];

    private readonly metamorphicRelations: MR[] = [];
    private inputAndOutputPairs: OriginalTestCase[] = [];

    private readonly engineConsole: Console | undefined;

    public constructor(engineConsole: Console | undefined) {
        this.engineConsole = engineConsole;
    }

    public setFormattingEngine(formattingEngine: FormattingEngine) {
        this.formattingEngine = formattingEngine;
    }

    public setFormatFunction(formatFunction: FormatFunction<T>) {
        this.customFormatFunction = formatFunction;
    }

    public addNameInputAndOutputPair(
        name: string,
        eol: EOL,
        input: TextTree,
        output: TextTree
    ): this {
        this.engineConsole?.log("Added test case:", name);
        this.inputAndOutputPairs.push({
            name: name,
            eol: eol,
            input: input,
            output: output,
        });
        return this;
    }

    public addMR(mr: MR): this {
        this.engineConsole?.log("Added mr:", mr.mrName);
        this.metamorphicRelations.push(mr);
        return this;
    }

    public addMRs(mrs: MR[]): void {
        mrs.forEach((mr) => {
            this.addMR(mr);
        });
    }

    private test(
        mr: MR,
        pair: OriginalTestCase
    ):
        | undefined
        | DebugTestingEngineOutput
        | { actual: T; expected: T; fileName: string; mrName: string } {
        let actualFolowUpOutput: T;
        let expectedFolowUpOutput: T;

        const folowUpInput = mr.inputFunction(pair.input);
        const expectedOutput = mr.outputFunction(pair.output);

        if (this.customFormatFunction) {
            // AST or custom output
            actualFolowUpOutput = this.customFormatFunction(
                folowUpInput,
                pair.eol
            );
            expectedFolowUpOutput = this.customFormatFunction(
                expectedOutput,
                pair.eol
            );
        } else if (this.formattingEngine) {
            // Text-based (legacy)
            const actualText = this.formattingEngine.formatText(
                folowUpInput,
                pair.eol,
                false
            );
            const expectedText = this.formattingEngine.formatText(
                expectedOutput,
                pair.eol,
                false
            );
            // @ts-ignore
            actualFolowUpOutput = actualText;
            // @ts-ignore
            expectedFolowUpOutput = expectedText;
        } else {
            throw new Error(
                `No formatting engine or custom format function set in MetamorphicEngine.`
            );
        }

        // For AST, you should compare using your own compareAst function in your test suite.
        // Here, just return both for the test to handle.
        if (
            actualFolowUpOutput !== undefined &&
            expectedFolowUpOutput !== undefined
        ) {
            // For text: compare directly
            if (
                typeof actualFolowUpOutput === "string" &&
                typeof expectedFolowUpOutput === "string"
            ) {
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
            // For AST: always return for external comparison
            return {
                fileName: pair.name,
                mrName: mr.mrName,
                actual: actualFolowUpOutput,
                expected: expectedFolowUpOutput,
            };
        }
        return undefined;
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

    public runAll(): (
        | T
        | boolean
        | { actual: T; expected: T; fileName: string; mrName: string }
    )[] {
        let results: (
            | T
            | boolean
            | { actual: T; expected: T; fileName: string; mrName: string }
        )[] = [];

        this.inputAndOutputPairs.forEach((pair) => {
            this.metamorphicRelations.forEach((mr) => {
                const result = this.test(mr, pair);
                if (result !== undefined) {
                    results.push(result as any);
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

    public getResults(): (
        | T
        | boolean
        | { actual: T; expected: T; fileName: string; mrName: string }
    )[] {
        return this.resultsList;
    }
}
