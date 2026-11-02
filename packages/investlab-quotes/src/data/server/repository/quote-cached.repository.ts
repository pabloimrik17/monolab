import { inject, injectable } from "inversify";
import { errAsync, ResultAsync } from "neverthrow";
import { QUOTES_DATA } from "#data/server/tokens.ts";
import { PersistenceError } from "@m0n0lab/investlab-core";
import type { QuoteFinnhubDatasource } from "#data/server/datasource/quote-finnhub.datasource.ts";
import type { QuoteRedisDatasource } from "#data/server/datasource/quote-redis.datasource.ts";
import type { QuoteRepository } from "#domain/repository/quote.repository.ts";
import type { Quote } from "#domain/value-object/quote.value-object.ts";

function normalizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
}

/** Cache first, then Finnhub, writing fetched quotes through to the cache. Cache failures never fail a request. */
@injectable()
export class QuoteCachedRepository implements QuoteRepository {
    constructor(
        @inject(QUOTES_DATA.QuoteRedisDatasource) private readonly cache: QuoteRedisDatasource,
        @inject(QUOTES_DATA.QuoteFinnhubDatasource)
        private readonly finnhub: QuoteFinnhubDatasource,
    ) {}

    getQuote(symbol: string): ResultAsync<Quote, PersistenceError> {
        const normalized = normalizeSymbol(symbol);
        if (!normalized) {
            return errAsync(new PersistenceError(new Error("Invalid empty symbol")));
        }

        return ResultAsync.fromPromise(this.fetchQuote(normalized), (e) => new PersistenceError(e));
    }

    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, PersistenceError> {
        const normalized = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
        return ResultAsync.fromPromise(
            this.fetchQuotes(normalized),
            (e) => new PersistenceError(e),
        );
    }

    private async fetchQuote(symbol: string): Promise<Quote> {
        const cached = await this.cache.get(symbol).catch((err: unknown) => {
            console.warn(
                `[QuoteRepository] cache read failed for ${symbol}, treating as miss:`,
                err,
            );
            return null;
        });
        if (cached !== null) {
            return cached;
        }

        const quote = await this.finnhub.getQuote(symbol);
        void this.writeThrough(symbol, quote);
        return quote;
    }

    private async fetchQuotes(symbols: string[]): Promise<Map<string, Quote>> {
        const result = await this.cache.getMany(symbols).catch((err: unknown) => {
            console.warn("[QuoteRepository] cache batch read failed, treating all as misses:", err);
            return new Map<string, Quote>();
        });
        const uncached = symbols.filter((symbol) => !result.has(symbol));
        if (uncached.length === 0) {
            return result;
        }

        const fetched = await this.finnhub.getQuotes(uncached);
        for (const [symbol, quote] of fetched) {
            result.set(symbol, quote);
            void this.writeThrough(symbol, quote);
        }
        return result;
    }

    // Best effort and off the response path: never rejects, and the caller never awaits it.
    private async writeThrough(symbol: string, quote: Quote): Promise<void> {
        try {
            await this.cache.set(symbol, quote);
        } catch (err) {
            console.warn(`[QuoteRepository] cache write failed for ${symbol}:`, err);
        }
    }
}
