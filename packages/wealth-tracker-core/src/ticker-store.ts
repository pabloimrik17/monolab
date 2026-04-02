import type { Storage, Ticker } from "./types.js";

const STORAGE_KEY = "wealth-tracker-tickers";

export interface TickerStore {
    add(symbol: string): Ticker;
    remove(symbol: string): void;
    getTickers(): Ticker[];
}

interface StoredTicker {
    symbol: string;
    addedAt: string;
}

export function createTickerStore(storage: Storage): TickerStore {
    let tickers: Map<string, Ticker> = new Map();

    const load = (): void => {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const stored: StoredTicker[] = JSON.parse(raw);
                tickers = new Map(
                    stored.map((t) => [
                        t.symbol,
                        { symbol: t.symbol, addedAt: new Date(t.addedAt) },
                    ]),
                );
            } catch {
                tickers = new Map();
            }
        }
    };

    const save = (): void => {
        const stored: StoredTicker[] = Array.from(tickers.values()).map((t) => ({
            symbol: t.symbol,
            addedAt: t.addedAt.toISOString(),
        }));
        storage.setItem(STORAGE_KEY, JSON.stringify(stored));
    };

    load();

    return {
        add(symbol: string): Ticker {
            const normalized = symbol.toUpperCase();
            if (tickers.has(normalized)) {
                return tickers.get(normalized)!;
            }
            const ticker: Ticker = {
                symbol: normalized,
                addedAt: new Date(),
            };
            tickers.set(normalized, ticker);
            save();
            return ticker;
        },

        remove(symbol: string): void {
            const normalized = symbol.toUpperCase();
            if (tickers.delete(normalized)) {
                save();
            }
        },

        getTickers(): Ticker[] {
            return Array.from(tickers.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
        },
    };
}
