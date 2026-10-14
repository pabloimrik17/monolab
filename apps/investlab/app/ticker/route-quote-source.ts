import { z } from "zod";
import { QUOTE_LIST_MAX_SYMBOLS, quoteDtoSchema, quoteSymbolSchema } from "@m0n0lab/investlab-quotes";
import type { QuoteSource } from "./quote-poller";
import type { Quote } from "./types";

const QUOTES_ROUTE = "/api/quotes";
const quoteListSchema = z.array(quoteDtoSchema);

/** Quotes from the web app's own resource route; the browser never talks to Finnhub or the API. */
export function createRouteQuoteSource(fetchFn: typeof fetch = fetch): QuoteSource {
    async function fetchChunk(symbols: string[]): Promise<Quote[]> {
        const query = new URLSearchParams({ symbols: symbols.join(",") });
        const response = await fetchFn(`${QUOTES_ROUTE}?${query}`);
        if (!response.ok) {
            throw new Error(`Quotes request failed: HTTP ${response.status}`);
        }
        const dtos = quoteListSchema.parse(await response.json());
        return dtos.map((dto) => ({ ...dto, updatedAt: new Date(dto.updatedAt) }));
    }

    return {
        async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
            const requestable = [
                ...new Set(
                    symbols
                        .filter((symbol) => quoteSymbolSchema.safeParse(symbol).success)
                        .map((symbol) => symbol.toUpperCase()),
                ),
            ];
            const chunks: string[][] = [];
            for (let start = 0; start < requestable.length; start += QUOTE_LIST_MAX_SYMBOLS) {
                chunks.push(requestable.slice(start, start + QUOTE_LIST_MAX_SYMBOLS));
            }
            const quotes = (await Promise.all(chunks.map(fetchChunk))).flat();
            return new Map(quotes.map((quote) => [quote.symbol, quote]));
        },
    };
}
