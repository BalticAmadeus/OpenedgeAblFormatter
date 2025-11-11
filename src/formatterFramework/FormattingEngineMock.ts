import { IParserHelper } from "../parser/IParserHelper";
import { FileIdentifier } from "../model/FileIdentifier";
import { EOL } from "../model/EOL";

export class FormattingEngineMock {
    constructor(readonly parserHelper: IParserHelper) {}

    public async formatText(
        text: string,
        eol: EOL,
        metemorphicEngineIsEnabled: boolean = false
    ): Promise<string> {
        // Use the worker-based format method
        return await this.parserHelper.format(
            new FileIdentifier("metamorphic", 1),
            text,
            { eol }
        );
    }
}
