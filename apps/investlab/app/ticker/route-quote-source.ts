import { z } from "zod";
import { quoteDtoSchema } from "@m0n0lab/investlab-data-contracts";
import type { QuoteSource } from "./quote-poller";
import type { Quote } from "./types";

const QUOTES_ROUTE = "/api/quotes";
const quoteListSchema = z.array(quoteDtoSchema);

/** Quotes from the web app's own resource route; the browser never talks to Finnhub or the API. */
export function createRouteQuoteSource(fetchFn: typeof fetch = fetch): QuoteSource {
    return {
        async getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
            const query = new URLSearchParams({ symbols: symbols.join(",") });
            const response = await fetchFn(`${QUOTES_ROUTE}?${query}`);
            if (!response.ok) {
                throw new Error(`Quotes request failed: HTTP ${response.status}`);
            }
            const dtos = quoteListSchema.parse(await response.json());
            return new Map(
                dtos.map((dto) => [dto.symbol, { ...dto, updatedAt: new Date(dto.updatedAt) }]),
            );
        },
    };
}
