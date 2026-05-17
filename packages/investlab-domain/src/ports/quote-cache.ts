import type { PersistenceError } from "../errors.ts";
import type { ResultAsync } from "neverthrow";

export interface Quote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    updatedAt: Date;
}

export interface QuoteCache {
    getQuote(symbol: string): ResultAsync<Quote, PersistenceError>;
    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, PersistenceError>;
}
