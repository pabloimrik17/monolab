import { inject, injectable } from "inversify";
import { z } from "zod";
import { PLATFORM, type KeyValueStorage } from "@m0n0lab/investlab-platform/client";
import type { Ticker } from "#domain/model/ticker.model.ts";
import type { TickerRepository } from "#domain/repository/ticker.repository.ts";

/** Key and format of the lists saved by the web's first ticker store; changing either drops saved watchlists. */
const STORAGE_KEY = "wealth-tracker-tickers";

const storedTickersSchema = z.array(z.object({ symbol: z.string(), addedAt: z.string() }));

@injectable()
export class TickerStorageRepository implements TickerRepository {
    constructor(@inject(PLATFORM.KeyValueStorage) private readonly storage: KeyValueStorage) {}

    findAll(): Ticker[] {
        const stored = storedTickersSchema.safeParse(this.storage.getObject<unknown>(STORAGE_KEY));
        if (!stored.success) {
            return [];
        }
        const tickers = new Map<string, Ticker>();
        for (const { symbol, addedAt } of stored.data) {
            tickers.set(symbol, { symbol, addedAt: new Date(addedAt) });
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
            STORAGE_KEY,
            tickers.map(({ symbol, addedAt }) => ({ symbol, addedAt: addedAt.toISOString() })),
        );
    }
}
