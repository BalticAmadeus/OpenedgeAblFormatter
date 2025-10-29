export enum EngineMode {
    clientTesting,
    debugTesting,
}

export interface BaseEngineOutput {
    mrName: string;
}

export interface DebugTestingEngineOutput extends BaseEngineOutput {
    fileName: string;
    actual: string;
    expected: string;
}
