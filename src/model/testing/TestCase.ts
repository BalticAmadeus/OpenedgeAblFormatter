export interface TestCase<I> {
    input: I;
    testFunction(I);
}
