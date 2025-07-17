import * as vscode from "vscode";
import Parser from "web-tree-sitter";
import { AblFormatterProvider } from "./providers/AblFormatterProvider";
import { Constants } from "./model/Constants";
import { AblParserHelper } from "./parser/AblParserHelper";
import { AblDebugHoverProvider } from "./providers/AblDebugHoverProvider";
import { ConfigurationManager } from "./utils/ConfigurationManager";
import { enableFormatterDecorators } from "./formatterFramework/enableFormatterDecorators";
import { DebugManager } from "./providers/DebugManager";
import { MetamorphicEngine } from "./mtest/MetamorphicEngine";
import { Telemetry } from "./utils/Telemetry";
import { ReplaceEQ } from "./mtest/mrs/ReplaceEQ";
import { ReplaceForEachToForLast } from "./mtest/mrs/ReplaceForEachToForLast";
import { RemoveNoError } from "./mtest/mrs/RemoveNoError";
import { BaseEngineOutput } from "./mtest/EngineParams";

const metamorphicTestingEngine = new MetamorphicEngine<BaseEngineOutput>(
    undefined //no excessive logging
);

export async function activate(context: vscode.ExtensionContext) {
    const debugManager = DebugManager.getInstance(context);

    await Parser.init().then(() => {});

    ConfigurationManager.getInstance();
    enableFormatterDecorators();

    context.subscriptions.push(Telemetry.getInstance());

    const parserHelper = new AblParserHelper(
        context.extensionPath,
        debugManager
    );

    const metamorphicRelationsList = [
        new ReplaceEQ(),
        new ReplaceForEachToForLast(),
        new RemoveNoError(),
    ];
    metamorphicTestingEngine.addMRs(metamorphicRelationsList);

    const formatter = new AblFormatterProvider(
        parserHelper,
        metamorphicTestingEngine
    );

    vscode.languages.registerDocumentRangeFormattingEditProvider(
        Constants.ablId,
        formatter
    );

    vscode.languages.registerDocumentFormattingEditProvider(
        Constants.ablId,
        formatter
    );

    const hoverProvider = new AblDebugHoverProvider(parserHelper);
    vscode.languages.registerHoverProvider(Constants.ablId, hoverProvider);
    Telemetry.sendExtensionSettings();

    setInterval(runPeriodicTask, 20_000);
}

function runPeriodicTask() {
    const resultList = metamorphicTestingEngine.runAll();
    let numOfFails = 0;

    resultList.forEach((result) => {
        if (result !== true) {
            numOfFails++;
            console.log("Fail", (result as BaseEngineOutput).mrName);
        }
    });

    if (resultList.length > 0) {
        console.log(
            "Num of test cases",
            resultList.length,
            ". Pass rate %",
            ((resultList.length - numOfFails) / resultList.length) * 100
        );
    } else {
        console.log("Nothing to test");
    }
}

// This method is called when your extension is deactivated
export function deactivate() {
    //do nothing
}
