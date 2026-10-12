export interface Ticker {
    symbol: string;
    addedAt: Date;
}

export interface Storage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export type { Quote } from "@m0n0lab/investlab-domain";
