export class DelayStrategy {
    private readonly calculateDelay?: Function

    constructor(calculateDelay?: Function) {
        this.calculateDelay = calculateDelay
    }

    private static _defaultStrategy(retries: number) {
        // (retries)^2 minutes
        return retries ** 2 * 60000
    }

    public calculate(retries: number) {
        if (!this.calculateDelay) {
            return DelayStrategy._defaultStrategy(retries)
        }

        return this.calculateDelay(retries)
    }
}

