export interface MR<T> {
    inputFunction(sourceInput: T): T;
    outputFunction(code: T): T;
}
