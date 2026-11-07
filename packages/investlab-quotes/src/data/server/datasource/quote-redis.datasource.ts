import { inject, injectable } from "inversify";
import { okAsync, Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import { PersistenceError } from "@m0n0lab/investlab-core";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";
import type { Quote } from "#domain/value-object/quote.value-object.ts";
import type Redis from "ioredis";

const TTL_SECONDS = 3600;
const KEY_PREFIX = "investlab:quote:";

// A quote as `set` stores it: JSON turns `updatedAt` into an ISO string.
const cachedQuoteSchema = z.object({
    symbol: z.string(),
    price: z.number(),
    change: z.number(),
    changePercent: z.number(),
    updatedAt: z
        .string()
        .datetime()
        .transform((iso) => new Date(iso)),
});

const parseJson = Result.fromThrowable(
    (raw: string): unknown => JSON.parse(raw),
    (cause) => cause,
);

function cacheKey(symbol: string): string {
    return `${KEY_PREFIX}${symbol}`;
}

// An entry that is not a quote as `set` stores it (not JSON, or another shape) reads as a miss.
function parseQuote(raw: string | null): Quote | null {
    if (raw === null) {
        return null;
    }

    const parsed = parseJson(raw).map((json) => cachedQuoteSchema.safeParse(json));
    return parsed.isOk() && parsed.value.success ? parsed.value.data : null;
}

const toPersistenceError = (cause: unknown) => new PersistenceError(cause);

/** Redis failures are errors here; the repository decides how to degrade. */
@injectable()
export class QuoteRedisDatasource {
    constructor(@inject(PLATFORM.Redis) private readonly redis: Redis) {}

    getMany(symbols: string[]): ResultAsync<Map<string, Quote>, PersistenceError> {
        if (symbols.length === 0) {
            return okAsync(new Map());
        }

        return ResultAsync.fromPromise(
            this.redis.mget(...symbols.map(cacheKey)),
            toPersistenceError,
        ).map((values) => {
            const result = new Map<string, Quote>();
            symbols.forEach((symbol, i) => {
                const quote = parseQuote(values[i] ?? null);
                if (quote !== null) {
                    result.set(symbol, quote);
                }
            });
            return result;
        });
    }

    set(symbol: string, quote: Quote): ResultAsync<void, PersistenceError> {
        return ResultAsync.fromPromise(
            this.redis.set(cacheKey(symbol), JSON.stringify(quote), "EX", TTL_SECONDS),
            toPersistenceError,
        ).map(() => undefined);
    }
}
