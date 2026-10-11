export interface Ticker {
    symbol: string;
    addedAt: Date;
}

export interface Quote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    updatedAt: Date;
}

export interface TickerWithQuote extends Ticker {
    quote: Quote | null;
}

export interface Storage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
