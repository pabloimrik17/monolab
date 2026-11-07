import type { Quote } from "#domain/value-object/quote.value-object.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export interface QuoteRepository<E extends Error = PersistenceError> {
    /** Resolves to `undefined` when the market has no data for the symbol. */
    getQuote(symbol: string): ResultAsync<Quote | undefined, E>;
    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, E>;
}
