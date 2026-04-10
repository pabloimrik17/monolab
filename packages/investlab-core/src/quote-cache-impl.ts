import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import { PersistenceError, type Quote, type QuoteCache } from "@m0n0lab/investlab-domain";
import { CORE_TOKENS } from "./tokens.ts";
import type { FinnhubClient } from "@m0n0lab/wealth-tracker-core";
import type Redis from "ioredis";

const DEFAULT_TTL_SECONDS = 3600; // 1 hour
const KEY_PREFIX = "investlab:quote:";

function normalizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
}

function cacheKey(symbol: string): string {
    return `${KEY_PREFIX}${normalizeSymbol(symbol)}`;
}

@injectable()
export class QuoteCacheImpl implements QuoteCache {
    private readonly ttl: number;

    constructor(
        @inject(CORE_TOKENS.Redis) private readonly redis: Redis,
        @inject(CORE_TOKENS.FinnhubClient)
        private readonly finnhub: FinnhubClient,
        @inject(CORE_TOKENS.CacheTtl) ttl?: number,
    ) {
        this.ttl = ttl ?? DEFAULT_TTL_SECONDS;
    }

    getQuote(symbol: string): ResultAsync<Quote, PersistenceError> {
        const normalized = normalizeSymbol(symbol);
        return ResultAsync.fromPromise(
            this.fetchWithCache(normalized),
            (e) => new PersistenceError(e),
        );
    }

    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, PersistenceError> {
        return ResultAsync.fromPromise(
            (async () => {
                const normalized = symbols.map(normalizeSymbol);
                const result = new Map<string, Quote>();

                // Try cache for all symbols
                const cached = await this.readCacheBatch(normalized);
                const uncached: string[] = [];

                for (const sym of normalized) {
                    const hit = cached.get(sym);
                    if (hit) {
                        result.set(sym, hit);
                    } else {
                        uncached.push(sym);
                    }
                }

                // Fetch uncached from Finnhub
                if (uncached.length > 0) {
                    const fetched = await this.finnhub.getQuotes(uncached);
                    for (const [sym, quote] of fetched) {
                        result.set(sym, quote);
                        void this.writeCache(sym, quote);
                    }
                }

                return result;
            })(),
            (e) => new PersistenceError(e),
        );
    }

    private async fetchWithCache(symbol: string): Promise<Quote> {
        // Try cache — graceful degradation on Redis failure
        try {
            const raw = await this.redis.get(cacheKey(symbol));
            if (raw) {
                const parsed = JSON.parse(raw) as Quote;
                return { ...parsed, updatedAt: new Date(parsed.updatedAt) };
            }
        } catch {
            // Redis read error — treat as cache miss
        }

        // Fetch from Finnhub
        const quote = await this.finnhub.getQuote(symbol);

        // Best-effort cache write
        void this.writeCache(symbol, quote);

        return quote;
    }

    private async readCacheBatch(symbols: string[]): Promise<Map<string, Quote>> {
        const result = new Map<string, Quote>();
        try {
            const keys = symbols.map(cacheKey);
            const values = await this.redis.mget(...keys);
            for (let i = 0; i < symbols.length; i++) {
                const raw = values[i];
                if (raw) {
                    const parsed = JSON.parse(raw) as Quote;
                    result.set(symbols[i]!, {
                        ...parsed,
                        updatedAt: new Date(parsed.updatedAt),
                    });
                }
            }
        } catch {
            // Redis read error — return empty map, all symbols uncached
        }
        return result;
    }

    private async writeCache(symbol: string, quote: Quote): Promise<void> {
        try {
            await this.redis.set(cacheKey(symbol), JSON.stringify(quote), "EX", this.ttl);
        } catch {
            // Redis write error — logged, best-effort
        }
    }
}
