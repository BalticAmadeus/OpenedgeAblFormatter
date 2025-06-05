import { FormattingEngine } from "../formatterFramework/FormattingEngine";
import { AblParserHelper } from "../parser/AblParserHelper";
import { DebugManagerMock } from "../stability-test/suite/DebugManagerMock";
import { ConfigurationManager } from "../utils/ConfigurationManager";
import { EOL } from "../model/EOL";
import { FileIdentifier } from "../model/FileIdentifier";
import { MetamorphicGroup, MG, OriginalTestCase, TextTree } from "./MG";
import { MGBuilder } from "./MGBuilder";
import { MR } from "./MR";

export class MetamorphicEngine {
    private readonly formattingEngine: FormattingEngine;

    private currentTestCase: OriginalTestCase<TextTree> | undefined = undefined;

    private metamorphicRelations: MR<TextTree>[] = [];
    private inputAndOutputPairs: OriginalTestCase<TextTree>[] = [];

    public constructor(formattingEngine: FormattingEngine) {
        this.formattingEngine = formattingEngine;
    }

    public addNameInputAndOutputPair(
        name: string,
        input: TextTree,
        output: TextTree
    ): this {
        this.inputAndOutputPairs.push({
            name: name,
            input: input,
            output: output,
        });
        return this;
    }

    public addMR(mr: MR<TextTree>): this {
        this.metamorphicRelations.push(mr);
        return this;
    }

    public runAll() {
        this.inputAndOutputPairs.forEach((pair) => {
            this.metamorphicRelations.forEach((mr) => {
                const folowUpInput = mr.inputFunction(pair.input);
                const actualFolowUpOutput = this.formattingEngine.formatText(
                    folowUpInput,
                    this.getFileEOL(folowUpInput)
                );
                const expectedFolowUpOutput = mr.outputFunction(pair.output);

                const result = actualFolowUpOutput === expectedFolowUpOutput;

                console.log(
                    mr.mrName,
                    pair.name,
                    "\n---input---\n",
                    pair.input,
                    "\n---output---\n",
                    pair.output,
                    "\n---folowUpInput---\n",
                    folowUpInput,
                    "\n---actualFolowUpOutput---\n",
                    actualFolowUpOutput,
                    "\n---expectedFolowUpOutput---\n",
                    expectedFolowUpOutput,
                    "\n---INPUT---\n",
                    "RESULT: " + result
                );
            });
        });
    }

    // public run(mrName: string, fileName: string): this {
    //     return this;
    // }

    // public run() {
    //     const mgs = MGBuilder.build();

    //     mgs.forEach((mg) => {
    //         this.runOneMG(mg);
    //     });
    // }

    // public runOneMG(mg: MG<any>): void {
    //     mg.inputAndOutputPairs.forEach((pair) => {
    //         const folowUpInput = mg.mr.inputFunction(pair.input);
    //         const actualFolowUpOutput = this.format(folowUpInput, pair.name);
    //         const expectedFolowUpOutput = mg.mr.outputFunction(pair.output);

    //         const result = actualFolowUpOutput === expectedFolowUpOutput;

    //         console.log(
    //             mg.mr.mrName,
    //             pair.name,
    //             "\n---input---\n",
    //             pair.input,
    //             "\n---output---\n",
    //             pair.output,
    //             "\n---folowUpInput---\n",
    //             folowUpInput,
    //             "\n---actualFolowUpOutput---\n",
    //             actualFolowUpOutput,
    //             "\n---expectedFolowUpOutput---\n",
    //             expectedFolowUpOutput,
    //             "\n---INPUT---\n",
    //             "RESULT: " + result
    //         );
    //     });
    // }

    private getFileEOL(fileText: string): EOL {
        if (fileText.includes("\r\n")) {
            return new EOL("\r\n"); // Windows EOL
        } else if (fileText.includes("\n")) {
            return new EOL("\n"); // Unix/Linux/Mac EO
        } else {
            return new EOL("\n"); // No EOL found
        }
    }
}
