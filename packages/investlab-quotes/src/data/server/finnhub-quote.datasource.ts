import { batchExecute } from "./batch.ts";
import type { Quote } from "../../domain/quote.ts";
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

export interface FinnhubQuoteDatasource {
    getQuote(symbol: string): Promise<Quote>;
    getQuotes(symbols: string[]): Promise<Map<string, Quote>>;
}

interface FinnhubQuoteResponse {
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

function toQuote(symbol: string, { c, d, dp }: FinnhubQuoteResponse): Quote {
    // Finnhub answers unknown symbols with an empty quote (`c: 0`, `d`/`dp` null).
    if (c === 0 || d == null || dp == null) {
        throw new Error(`No data for symbol: ${symbol}`);
    }
    return { symbol, price: c, change: d, changePercent: dp, updatedAt: new Date() };
}

export function createFinnhubQuoteDatasource(
    apiKey: string,
    http: HttpClient,
): FinnhubQuoteDatasource {
    if (!apiKey) {
        throw new Error("API key is required");
    }

    const fetchQuote = async (symbol: string): Promise<Quote> => {
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
        const response = await http.request({ method: "GET", url });
        if (response.isErr()) {
            throw response.error;
        }
        assertSuccess(symbol, response.value.status);
        return toQuote(symbol, response.value.body as FinnhubQuoteResponse);
    };

    return {
        async getQuote(symbol: string): Promise<Quote> {
            return fetchQuote(symbol.toUpperCase());
        },

        async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
            const normalizedSymbols = symbols.map((s) => s.toUpperCase());
            return batchExecute(normalizedSymbols, fetchQuote, { concurrency: CONCURRENCY });
        },
    };
}
