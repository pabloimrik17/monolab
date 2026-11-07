import { err, ok, okAsync, type Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import type { NetworkError } from "@m0n0lab/investlab-core";
import type { HttpClient } from "@m0n0lab/investlab-platform";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const CONCURRENCY = 10;
const AUTH_FAILURES = new Set([401, 403]);

// Only the fields the quotes module reads; Finnhub also sends high, low, open, previous close and time.
const finnhubQuoteResponseSchema = z.object({
    c: z.number(), // current price
    d: z.number().nullable(), // change (null for unknown symbols)
    dp: z.number().nullable(), // percent change (null for unknown symbols)
});

export type FinnhubQuoteResponse = z.infer<typeof finnhubQuoteResponseSchema>;

/** Finnhub refused the configured key, so every other request would fail the same way. */
export class FinnhubAuthError extends Error {
    readonly code = "FINNHUB_AUTH_FAILED";
    constructor(symbol: string, status: number) {
        super(`Finnhub rejected the API key (HTTP ${status}) for ${symbol}; check FINNHUB_API_KEY`);
        this.name = "FinnhubAuthError";
    }
}

/** Finnhub answered with an error status other than an auth failure, or with a body of another shape. */
class FinnhubResponseError extends Error {
    readonly code = "FINNHUB_BAD_RESPONSE";
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "FinnhubResponseError";
    }
}

/** Finnhub could not be reached or answered with a failure; another request may succeed. */
export type FinnhubUpstreamError = FinnhubResponseError | NetworkError;

export type FinnhubQuoteError = FinnhubAuthError | FinnhubUpstreamError;

/** What a batch of quote requests got: each symbol's response, or its upstream failure. */
export interface FinnhubQuotes {
    readonly responses: ReadonlyMap<string, FinnhubQuoteResponse>;
    readonly failures: ReadonlyMap<string, FinnhubUpstreamError>;
}

type Settled = readonly [string, Result<FinnhubQuoteResponse, FinnhubUpstreamError>];

function readQuote(
    symbol: string,
    status: number,
    body: unknown,
): Result<FinnhubQuoteResponse, FinnhubAuthError | FinnhubResponseError> {
    if (AUTH_FAILURES.has(status)) {
        return err(new FinnhubAuthError(symbol, status));
    }

    if (status < 200 || status >= 300) {
        return err(new FinnhubResponseError(`Failed to fetch quote for ${symbol}: HTTP ${status}`));
    }

    const parsed = finnhubQuoteResponseSchema.safeParse(body);
    return parsed.success
        ? ok(parsed.data)
        : err(new FinnhubResponseError(`Unreadable quote for ${symbol}`, { cause: parsed.error }));
}

function toFinnhubQuotes(settled: readonly Settled[]): FinnhubQuotes {
    const responses = new Map<string, FinnhubQuoteResponse>();
    const failures = new Map<string, FinnhubUpstreamError>();
    for (const [symbol, result] of settled) {
        if (result.isOk()) {
            responses.set(symbol, result.value);
        } else {
            failures.set(symbol, result.error);
        }
    }
    return { responses, failures };
}

/** Finnhub's quote endpoint. Its request URL carries the key, so no error ever includes it. */
export class FinnhubClient {
    constructor(
        private readonly apiKey: string,
        private readonly http: HttpClient,
    ) {
        if (!apiKey) {
            throw new Error("API key is required");
        }
    }

    getQuote(symbol: string): ResultAsync<FinnhubQuoteResponse, FinnhubQuoteError> {
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(this.apiKey)}`;
        return this.http
            .request({ method: "GET", url })
            .andThen(({ status, body }) => readQuote(symbol, status, body));
    }

    /**
     * Sends the requests in batches of fixed concurrency. An auth failure fails the whole call and
     * sends no further batch; any other failure is kept for its symbol.
     */
    getQuotes(symbols: string[]): ResultAsync<FinnhubQuotes, FinnhubAuthError> {
        const batches = Array.from({ length: Math.ceil(symbols.length / CONCURRENCY) }, (_, i) =>
            symbols.slice(i * CONCURRENCY, (i + 1) * CONCURRENCY),
        );

        return batches
            .reduce(
                (sent, batch) =>
                    sent.andThen((settled) =>
                        ResultAsync.combine(batch.map((symbol) => this.settleQuote(symbol))).map(
                            (batchSettled) => [...settled, ...batchSettled],
                        ),
                    ),
                okAsync<Settled[], FinnhubAuthError>([]),
            )
            .map(toFinnhubQuotes);
    }

    private settleQuote(symbol: string): ResultAsync<Settled, FinnhubAuthError> {
        return this.getQuote(symbol)
            .map((response): Settled => [symbol, ok(response)])
            .orElse((error) =>
                error instanceof FinnhubAuthError ? err(error) : ok<Settled>([symbol, err(error)]),
            );
    }
}
