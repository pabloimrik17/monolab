export interface BatchOptions {
    concurrency: number;
}

export async function batchExecute<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    options: BatchOptions
): Promise<Map<T, R>> {
    const results = new Map<T, R>();
    const { concurrency } = options;

    if (!Number.isInteger(concurrency) || concurrency <= 0) {
        throw new Error("Concurrency must be a positive integer");
    }

    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const batchResults = await Promise.allSettled(batch.map(fn));

        batchResults.forEach((result, index) => {
            const item = batch[index];
            if (result.status === "fulfilled" && item !== undefined) {
                results.set(item, result.value);
            }
        });
    }

    return results;
}
