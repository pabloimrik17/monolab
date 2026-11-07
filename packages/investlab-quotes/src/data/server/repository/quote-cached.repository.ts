import { inject, injectable } from "inversify";
import { err, errAsync, ok, okAsync, type ResultAsync } from "neverthrow";
import { QUOTES_DATA } from "#data/server/tokens.ts";
import { MarketDataUnavailableError } from "#domain/error/market-data-unavailable.error.ts";
import { PersistenceError } from "@m0n0lab/investlab-core";
import type {
    NoQuoteDataError,
    QuoteFinnhubDatasource,
} from "#data/server/datasource/quote-finnhub.datasource.ts";
import type { QuoteRedisDatasource } from "#data/server/datasource/quote-redis.datasource.ts";
import type { FinnhubQuoteError } from "#data/server/infra/http/finnhub.client.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";

type QuoteRepositoryError = PersistenceError | MarketDataUnavailableError;

function normalizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
}

// A rejected key or an unknown symbol is not market data being unavailable: retrying will not help.
function toRepositoryError(error: FinnhubQuoteError | NoQuoteDataError): QuoteRepositoryError {
    return error.code === "FINNHUB_AUTH_FAILED" || error.code === "NO_QUOTE_DATA"
        ? new PersistenceError(error)
        : new MarketDataUnavailableError(error);
}

/**
 * Cache first, then Finnhub, writing fetched quotes through to the cache. Cache failures never fail
 * a request; a key Finnhub rejects fails it, since no symbol can be fetched.
 */
@injectable()
export class QuoteCachedRepository implements QuoteRepository<QuoteRepositoryError> {
    constructor(
        @inject(QUOTES_DATA.QuoteRedisDatasource) private readonly cache: QuoteRedisDatasource,
        @inject(QUOTES_DATA.QuoteFinnhubDatasource)
        private readonly finnhub: QuoteFinnhubDatasource,
    ) {}

    getQuote(symbol: string): ResultAsync<Quote, QuoteRepositoryError> {
        const normalized = normalizeSymbol(symbol);
        if (!normalized) {
            return errAsync(new PersistenceError(new Error("Invalid empty symbol")));
        }

        return this.cache
            .get(normalized)
            .orElse((error) => {
                console.warn(
                    `[QuoteRepository] cache read failed for ${normalized}, treating as miss:`,
                    error,
                );
                return ok(null);
            })
            .andThen((cached) =>
                cached === null
                    ? this.finnhub
                          .getQuote(normalized)
                          .andTee((quote) => this.writeThrough(normalized, quote))
                          .mapErr(toRepositoryError)
                    : okAsync(cached),
            );
    }

    /**
     * Fails as market data unavailable only when Finnhub failed for some symbol and nothing, cached
     * or fetched, can be answered; symbols Finnhub merely has no data for leave an empty map.
     */
    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, QuoteRepositoryError> {
        const normalized = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];

        return this.cache
            .getMany(normalized)
            .orElse((error) => {
                console.warn(
                    "[QuoteRepository] cache batch read failed, treating all as misses:",
                    error,
                );
                return ok(new Map<string, Quote>());
            })
            .andThen((cached) =>
                this.finnhub
                    .getQuotes(normalized.filter((symbol) => !cached.has(symbol)))
                    .mapErr((cause) => new PersistenceError(cause))
                    .andThen(({ quotes, failures }) => {
                        for (const [symbol, quote] of quotes) {
                            cached.set(symbol, quote);
                            this.writeThrough(symbol, quote);
                        }
                        return cached.size === 0 && failures.size > 0
                            ? err(new MarketDataUnavailableError(failures))
                            : ok(cached);
                    }),
            );
    }

    // Best effort and off the response path: the caller never waits for it, and a failure is only logged.
    private writeThrough(symbol: string, quote: Quote): void {
        void this.cache.set(symbol, quote).mapErr((error) => {
            console.warn(`[QuoteRepository] cache write failed for ${symbol}:`, error);
        });
    }
}
