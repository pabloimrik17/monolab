// Every screen fed by a payload-free signal stream has the same problem: a burst of signals
// must not become a burst of snapshot requests. This keeps one request in flight, collapses
// everything that arrives during it into a single trailing refetch, and drops any response
// that is no longer the newest one issued.
//
// Shared by the board, the guest status screen and the admin queue — it knows nothing about
// what it is fetching.
export interface CoalescingRefetch {
    /** Ask for a refetch. Resolves once the cycle covering this request has settled. */
    trigger(): Promise<void>;
    /** Stop refetching for good; anything still in flight is discarded on arrival. */
    stop(): void;
}

export interface CoalescingRefetchOptions<T> {
    fetch: () => Promise<T>;
    apply: (value: T) => void;
    onError?: (error: unknown) => void;
}

export function createCoalescingRefetch<T>(
    options: CoalescingRefetchOptions<T>,
): CoalescingRefetch {
    const report = options.onError ?? (() => {});
    let cycle: Promise<void> | null = null;
    let queued = false;
    let stopped = false;
    let latest = 0;

    // A response is worth applying only if it is still the newest one asked for.
    const isCurrent = (id: number): boolean => !stopped && id === latest;

    const runOnce = async (): Promise<void> => {
        const id = ++latest;
        try {
            const value = await options.fetch();
            if (isCurrent(id)) options.apply(value);
        } catch (error) {
            if (isCurrent(id)) report(error);
        }
    };

    const drain = async (): Promise<void> => {
        do {
            queued = false;
            await runOnce();
        } while (queued && !stopped);
    };

    return {
        trigger(): Promise<void> {
            if (stopped) return Promise.resolve();
            if (cycle) {
                queued = true;
                return cycle;
            }
            cycle = drain().finally(() => {
                cycle = null;
            });
            return cycle;
        },
        stop(): void {
            stopped = true;
            queued = false;
        },
    };
}
