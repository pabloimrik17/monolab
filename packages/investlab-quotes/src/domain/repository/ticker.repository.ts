import type { Ticker } from "#domain/model/ticker.model.ts";

/** The followed tickers. Reads never fail: what cannot be read is no tickers. */
export interface TickerRepository {
    findAll(): Ticker[];
    add(ticker: Ticker): void;
    remove(symbol: string): void;
}
