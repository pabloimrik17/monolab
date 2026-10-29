import type { Quote } from "#domain/model/quote.model.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export interface QuoteRepository<E extends Error = PersistenceError> {
    getQuote(symbol: string): ResultAsync<Quote, E>;
    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, E>;
}
