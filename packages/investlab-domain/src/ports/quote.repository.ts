import type { PersistenceError } from "../errors.ts";
import type { ResultAsync } from "neverthrow";

export interface Quote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    updatedAt: Date;
}

export interface QuoteRepository<E extends Error = PersistenceError> {
    getQuote(symbol: string): ResultAsync<Quote, E>;
    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, E>;
}
