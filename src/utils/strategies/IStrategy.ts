import { ParseResult } from "../../model/ParseResult";

export interface CodeBlock {
    start: number;
    end: number;
    text?: string;
}

export interface IStrategy {
    name?: string;
    //applicable(input: string, parseResult?: ParseResult): boolean;
    generate(input: string, parseResult?: ParseResult): CodeBlock[];
}
