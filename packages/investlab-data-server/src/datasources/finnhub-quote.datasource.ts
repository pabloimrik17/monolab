import { batchExecute } from "./batch.ts";
import type { Quote } from "@m0n0lab/investlab-domain";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const DEFAULT_CONCURRENCY = 10;

export class FinnhubAuthError extends Error {
    constructor(symbol: string, status: number) {
        super(`Finnhub rejected the API key (HTTP ${status}) for ${symbol}; check FINNHUB_API_KEY`);
        this.name = "FinnhubAuthError";
    }
}

export interface FinnhubQuoteDatasourceOptions {
    concurrency?: number;
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

export function createFinnhubQuoteDatasource(
    apiKey: string,
    options: FinnhubQuoteDatasourceOptions = {},
): FinnhubQuoteDatasource {
    if (!apiKey) {
        throw new Error("API key is required");
    }

    const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
    if (!Number.isInteger(concurrency) || concurrency <= 0) {
        throw new Error("Concurrency must be a positive integer");
    }

    const fetchQuote = async (symbol: string): Promise<Quote> => {
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(
            symbol,
        )}&token=${apiKey}`;
        const response = await fetch(url);

        if (response.status === 401 || response.status === 403) {
            throw new FinnhubAuthError(symbol, response.status);
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch quote for ${symbol}: ${response.statusText}`);
        }

        const data = (await response.json()) as FinnhubQuoteResponse;

        const { c, d, dp } = data;
        if (c === 0 || d == null || dp == null) {
            throw new Error(`No data for symbol: ${symbol}`);
        }

        return {
            symbol: symbol.toUpperCase(),
            price: c,
            change: d,
            changePercent: dp,
            updatedAt: new Date(),
        };
    };

    return {
        async getQuote(symbol: string): Promise<Quote> {
            return fetchQuote(symbol.toUpperCase());
        },

        async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
            const normalizedSymbols = symbols.map((s) => s.toUpperCase());
            const results = await batchExecute(normalizedSymbols, fetchQuote, {
                concurrency,
            });

            const quoteMap = new Map<string, Quote>();
            for (const [symbol, quote] of results) {
                quoteMap.set(symbol, quote);
            }
            return quoteMap;
        },
    };
}
