import { inject, injectable } from "inversify";
import { err, ok, type ResultAsync } from "neverthrow";
import { QUOTES_DATA } from "#data/server/tokens.ts";
import { MarketDataUnavailableError } from "#domain/error/market-data-unavailable.error.ts";
import { PersistenceError } from "@m0n0lab/investlab-core";
import type { QuoteFinnhubDatasource } from "#data/server/datasource/quote-finnhub.datasource.ts";
import type { QuoteRedisDatasource } from "#data/server/datasource/quote-redis.datasource.ts";
import type { QuotesServerError } from "#domain/error/quotes-server.error.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";

function normalizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
}

/**
 * Cache first, then Finnhub, writing fetched quotes through to the cache. Cache failures never fail
 * a request; a key Finnhub rejects fails it, since no symbol can be fetched.
 */
@injectable()
export class QuoteCachedRepository implements QuoteRepository {
    constructor(
        @inject(QUOTES_DATA.QuoteRedisDatasource) private readonly cache: QuoteRedisDatasource,
        @inject(QUOTES_DATA.QuoteFinnhubDatasource)
        private readonly finnhub: QuoteFinnhubDatasource,
    ) {}

    getQuote(symbol: string): ResultAsync<Quote | undefined, QuotesServerError> {
        return this.getQuotes([symbol]).map((quotes) => quotes.get(normalizeSymbol(symbol)));
    }

    /**
     * Fails as market data unavailable only when Finnhub failed for some symbol and nothing, cached
     * or fetched, can be answered; symbols Finnhub merely has no data for leave an empty map.
     */
    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, QuotesServerError> {
        const normalized = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];

        return this.cache
            .getMany(normalized)
            .orElse((error) => {
                console.warn(
                    "[QuoteCachedRepository] cache batch read failed, treating all as misses:",
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
            console.warn(`[QuoteCachedRepository] cache write failed for ${symbol}:`, error);
        });
    }
}
