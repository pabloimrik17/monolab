import { inject, injectable } from "inversify";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";
import type { Quote } from "../../domain/quote.ts";
import type Redis from "ioredis";

const TTL_SECONDS = 3600;
const KEY_PREFIX = "investlab:quote:";

function cacheKey(symbol: string): string {
    return `${KEY_PREFIX}${symbol}`;
}

function parseQuote(raw: string | null): Quote | null {
    if (raw === null) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as Quote;
        return { ...parsed, updatedAt: new Date(parsed.updatedAt) };
    } catch {
        return null;
    }
}

/** Quotes cached by normalized symbol. Redis failures reject; the repository decides how to degrade. */
@injectable()
export class RedisQuoteDatasource {
    constructor(@inject(PLATFORM.Redis) private readonly redis: Redis) {}

    async get(symbol: string): Promise<Quote | null> {
        return parseQuote(await this.redis.get(cacheKey(symbol)));
    }

    async getMany(symbols: string[]): Promise<Map<string, Quote>> {
        const result = new Map<string, Quote>();
        if (symbols.length === 0) {
            return result;
        }
        const values = await this.redis.mget(...symbols.map(cacheKey));
        symbols.forEach((symbol, i) => {
            const quote = parseQuote(values[i] ?? null);
            if (quote !== null) {
                result.set(symbol, quote);
            }
        });
        return result;
    }

    async set(symbol: string, quote: Quote): Promise<void> {
        await this.redis.set(cacheKey(symbol), JSON.stringify(quote), "EX", TTL_SECONDS);
    }
}
