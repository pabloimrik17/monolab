import type { Owner } from "solid-js";

export abstract class BaseViewModel {
    private cleanups: (() => void)[] = [];

    addCleanup(...fns: (() => void)[]): void {
        this.cleanups.push(...fns);
    }

    didMount(_owner?: Owner): Promise<void> | void {}

    willUnmount(): void {
        for (const cleanup of this.cleanups) {
            cleanup();
        }
        this.cleanups = [];
    }
}
