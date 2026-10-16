export interface BatchOptions {
    concurrency: number;
}

export async function batchExecute<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    options: BatchOptions,
): Promise<Map<T, R>> {
    const results = new Map<T, R>();
    const { concurrency } = options;

    if (!Number.isInteger(concurrency) || concurrency <= 0) {
        throw new Error("concurrency must be a positive integer");
    }

    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const batchResults = await Promise.allSettled(batch.map(fn));

        batchResults.forEach((result, index) => {
            const item = batch[index];
            if (item === undefined) return;
            if (result.status === "fulfilled") {
                results.set(item, result.value);
                return;
            }
            const reason: unknown = result.reason;
            console.error(
                `[batchExecute] ${String(item)} failed:`,
                reason instanceof Error ? reason.message : reason,
            );
        });
    }

    return results;
}
