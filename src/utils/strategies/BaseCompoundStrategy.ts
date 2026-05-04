import { IStrategy } from "./IStrategy";

export abstract class BaseCompoundStrategy {
    protected subStrategies: IStrategy[] = [];
    private currentIndex = 0;

    reset() {
        this.currentIndex = 0;
    }

    getNextSubStrategy(): IStrategy | undefined {
        if (this.currentIndex < this.subStrategies.length) {
            return this.subStrategies[this.currentIndex++];
        }
        return undefined;
    }
}