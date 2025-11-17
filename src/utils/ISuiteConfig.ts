import { AblParserHelper } from "../parser/AblParserHelper";

export interface ISuiteConfig<TResult extends { tree: any; text: string }> {
    testType: string;
    knownFailuresFile: string;
    resultFailuresFile: string;
    processBeforeText: (
        text: string,
        parserHelper: AblParserHelper
    ) => Promise<TResult>;
    processAfterText: (
        text: string,
        parserHelper: AblParserHelper
    ) => Promise<TResult>;
    compareResults: (
        before: TResult,
        after: TResult,
        parserHelper?: AblParserHelper
    ) => Promise<boolean>;
    onMismatch?: (before: TResult, after: TResult, fileName: string) => void;
    cleanup?: (before: TResult, after: TResult) => void;
}
