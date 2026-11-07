import type { QuotesServerError } from "#domain/error/quotes-server.error.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";
import type { ResultAsync } from "neverthrow";

// `E` defaults to the server-side failure; the HTTP implementation uses `QuotesRemoteError`.
export interface QuoteRepository<E extends Error = QuotesServerError> {
    getQuote(symbol: string): ResultAsync<Quote | undefined, E>;
    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, E>;
}
