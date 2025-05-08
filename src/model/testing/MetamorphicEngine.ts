import { FormattingEngine } from "../../formatterFramework/FormattingEngine";
import { AblParserHelper } from "../../parser/AblParserHelper";
import { DebugManagerMock } from "../../stability-test/suite/DebugManagerMock";
import { ConfigurationManager } from "../../utils/ConfigurationManager";
import { EOL } from "../EOL";
import { FileIdentifier } from "../FileIdentifier";
import { MG } from "./MG";
import { MGBuilder } from "./MGBuilder";

export class MetamorphicEngine {
    private readonly parserHelper: AblParserHelper;

    public constructor(parserHelper: AblParserHelper) {
        this.parserHelper = parserHelper;
    }

    public run() {
        const mgs = MGBuilder.build();

        mgs.forEach((mg) => {
            this.runOneMG(mg);
        });
    }

    public runOneMG(mg: MG<any>): void {
        mg.inputAndOutputPairs.forEach((pair) => {
            const folowUpInput = mg.mr.inputFunction(pair.input);
            const actualFolowUpOutput = this.format(folowUpInput, pair.name);
            const expectedFolowUpOutput = mg.mr.outputFunction(pair.output);

            const result = actualFolowUpOutput === expectedFolowUpOutput;

            console.log(
                mg.mr.mrName,
                pair.name,
                result,
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
                "\n---INPUT---\n"
            );
        });
    }

    private format(text: string, name: string): string {
        const configurationManager = ConfigurationManager.getInstance();

        const codeFormatter = new FormattingEngine(
            this.parserHelper,
            new FileIdentifier(name, 1),
            configurationManager,
            new DebugManagerMock()
        );

        const result = codeFormatter.formatText(
            text,
            new EOL(this.getFileEOL(text))
        );

        return result;
    }

    private getFileEOL(fileText: string): string {
        if (fileText.includes("\r\n")) {
            return "\r\n"; // Windows EOL
        } else if (fileText.includes("\n")) {
            return "\n"; // Unix/Linux/Mac EO
        } else {
            return "\n"; // No EOL found
        }
    }
}
