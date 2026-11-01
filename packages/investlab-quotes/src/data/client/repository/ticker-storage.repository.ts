import { inject, injectable } from "inversify";
import { z } from "zod";
import { Ticker } from "#domain/model/ticker.model.ts";
import { PLATFORM_SHARED, type KeyValueStorage } from "@m0n0lab/investlab-platform";
import type { TickerRepository } from "#domain/repository/ticker.repository.ts";

/** Key and format of the saved ticker lists; changing either drops saved watchlists. */
export const TICKERS_STORAGE_KEY = "investlab-tickers";

const storedTickersSchema = z.array(
    z.object({ symbol: z.string(), addedAt: z.string().datetime() }),
);

@injectable()
export class TickerStorageRepository implements TickerRepository {
    constructor(
        @inject(PLATFORM_SHARED.KeyValueStorage) private readonly storage: KeyValueStorage,
    ) {}

    findAll(): Ticker[] {
        const stored = storedTickersSchema.safeParse(
            this.storage.getObject<unknown>(TICKERS_STORAGE_KEY),
        );
        if (!stored.success) {
            return [];
        }
        const tickers = new Map<string, Ticker>();
        for (const { symbol, addedAt } of stored.data) {
            tickers.set(symbol, Ticker.reconstitute({ symbol, addedAt: new Date(addedAt) }));
        }
        return [...tickers.values()];
    }

    add(ticker: Ticker): void {
        this.save([...this.findAll().filter((t) => t.symbol !== ticker.symbol), ticker]);
    }

    remove(symbol: string): void {
        const tickers = this.findAll();
        const remaining = tickers.filter((t) => t.symbol !== symbol);
        if (remaining.length !== tickers.length) {
            this.save(remaining);
        }
    }

    private save(tickers: Ticker[]): void {
        this.storage.setObject(
            TICKERS_STORAGE_KEY,
            tickers.map((ticker) => ({
                symbol: ticker.symbol,
                addedAt: ticker.addedAt.toISOString(),
            })),
        );
    }
}
