import { batchExecute } from "./utils/batch.js";
import type { Quote } from "./types.js";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const DEFAULT_CONCURRENCY = 10;

export interface FinnhubClientOptions {
    concurrency?: number;
}

export interface FinnhubClient {
    getQuote(symbol: string): Promise<Quote>;
    getQuotes(symbols: string[]): Promise<Map<string, Quote>>;
}

interface FinnhubQuoteResponse {
    c: number; // current price
    d: number; // change
    dp: number; // percent change
    h: number; // high
    l: number; // low
    o: number; // open
    pc: number; // previous close
    t: number; // timestamp
}

export function createFinnhubClient(
    apiKey: string,
    options: FinnhubClientOptions = {},
): FinnhubClient {
    if (!apiKey) {
        throw new Error("API key is required");
    }

    const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

    const fetchQuote = async (symbol: string): Promise<Quote> => {
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(
            symbol,
        )}&token=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch quote for ${symbol}: ${response.statusText}`);
        }

        const data = (await response.json()) as FinnhubQuoteResponse;

        if (data.c === 0 && data.d === 0 && data.dp === 0) {
            throw new Error(`No data for symbol: ${symbol}`);
        }

        return {
            symbol: symbol.toUpperCase(),
            price: data.c,
            change: data.d,
            changePercent: data.dp,
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
