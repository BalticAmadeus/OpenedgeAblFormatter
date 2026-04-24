export interface IStrategy {
    applicable(input: string): boolean;
    generate(input: string): string[];
}
