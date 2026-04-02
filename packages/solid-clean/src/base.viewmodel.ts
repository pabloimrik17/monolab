import type { Owner } from "solid-js";

export abstract class BaseViewModel {
    private cleanups: (() => void)[] = [];

    addCleanup(...fns: (() => void)[]): void {
        this.cleanups.push(...fns);
    }

    didMount(_owner?: Owner): Promise<void> | void {}

    willUnmount(): void {
        const errors: unknown[] = [];
        for (const cleanup of this.cleanups) {
            try {
                cleanup();
            } catch (e) {
                errors.push(e);
            }
        }
        this.cleanups = [];
        if (errors.length > 0) {
            throw new AggregateError(errors, "Errors during cleanup");
        }
    }
}
