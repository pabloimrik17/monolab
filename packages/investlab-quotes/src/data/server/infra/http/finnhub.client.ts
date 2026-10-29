import type { HttpClient } from "@m0n0lab/investlab-platform/server";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const CONCURRENCY = 10;
const AUTH_FAILURES = new Set([401, 403]);

class FinnhubAuthError extends Error {
    constructor(symbol: string, status: number) {
        super(`Finnhub rejected the API key (HTTP ${status}) for ${symbol}; check FINNHUB_API_KEY`);
        this.name = "FinnhubAuthError";
    }
}

export interface FinnhubQuoteResponse {
    c: number; // current price
    d: number | null; // change (null for unknown symbols)
    dp: number | null; // percent change (null for unknown symbols)
    h: number; // high
    l: number; // low
    o: number; // open
    pc: number; // previous close
    t: number; // timestamp
}

function assertSuccess(symbol: string, status: number): void {
    if (AUTH_FAILURES.has(status)) {
        throw new FinnhubAuthError(symbol, status);
    }
    if (status < 200 || status >= 300) {
        throw new Error(`Failed to fetch quote for ${symbol}: HTTP ${status}`);
    }
}

async function batchExecute<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrency: number,
): Promise<Map<T, R>> {
    const results = new Map<T, R>();

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
                `[FinnhubClient] ${String(item)} failed:`,
                reason instanceof Error ? reason.message : reason,
            );
        });
    }

    return results;
}

/** Finnhub's quote endpoint. Failures reject; symbols that fail in a batch are logged and left out. */
export class FinnhubClient {
    constructor(
        private readonly apiKey: string,
        private readonly http: HttpClient,
    ) {
        if (!apiKey) {
            throw new Error("API key is required");
        }
    }

    async getQuote(symbol: string): Promise<FinnhubQuoteResponse> {
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${this.apiKey}`;
        const response = await this.http.request({ method: "GET", url });
        if (response.isErr()) {
            throw response.error;
        }
        assertSuccess(symbol, response.value.status);
        return response.value.body as FinnhubQuoteResponse;
    }

    async getQuotes(symbols: string[]): Promise<Map<string, FinnhubQuoteResponse>> {
        return batchExecute(symbols, (symbol) => this.getQuote(symbol), CONCURRENCY);
    }
}
