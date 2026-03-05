import { AblParserHelper } from "../parser/AblParserHelper";

export interface ISuiteConfig<TResult> {
    testType: string;
    knownFailuresFile: string;
    resultFailuresFile: string;
    processBeforeText: (text: string) => TResult;
    processAfterText: (text: string, parserHelper: AblParserHelper) => TResult;
    compareResults: (
        before: TResult,
        after: TResult,
        parserHelper?: AblParserHelper
    ) => boolean;
    onMismatch?: (before: TResult, after: TResult, fileName: string) => void;
    cleanup?: (before: TResult, after: TResult) => void;
}
