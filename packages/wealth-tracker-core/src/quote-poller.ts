import type { FinnhubClient } from "./finnhub-client.js";
import type { Quote } from "./types.js";

const MIN_INTERVAL = 15_000;
const MAX_INTERVAL = 60_000;
const DEFAULT_INTERVAL = 30_000;

export interface QuotePollerOptions {
    interval?: number;
    onUpdate: (quotes: Map<string, Quote>) => void;
    onError?: (error: Error) => void;
}

export interface QuotePoller {
    start(tickers: string[]): void;
    stop(): void;
    setInterval(ms: number): void;
    setTickers(tickers: string[]): void;
    isPolling(): boolean;
}

export function createQuotePoller(client: FinnhubClient, options: QuotePollerOptions): QuotePoller {
    let interval = clampInterval(options.interval ?? DEFAULT_INTERVAL);
    let tickers: string[] = [];
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let polling = false;
    let generation = 0;

    const { onUpdate, onError } = options;

    function clampInterval(ms: number): number {
        return Math.min(Math.max(ms, MIN_INTERVAL), MAX_INTERVAL);
    }

    async function poll(pollGeneration: number): Promise<void> {
        if (tickers.length === 0) {
            if (polling && pollGeneration === generation) {
                timerId = setTimeout(() => void poll(pollGeneration), interval);
            }
            return;
        }

        try {
            const quotes = await client.getQuotes(tickers);
            if (polling && pollGeneration === generation) {
                onUpdate(quotes);
            }
        } catch (error) {
            if (polling && pollGeneration === generation) {
                onError?.(error instanceof Error ? error : new Error(String(error)));
            }
        }

        if (polling && pollGeneration === generation) {
            timerId = setTimeout(() => void poll(pollGeneration), interval);
        }
    }

    return {
        start(initialTickers: string[]): void {
            if (polling) {
                return;
            }

            generation++;
            tickers = initialTickers.map((t) => t.toUpperCase());
            polling = true;

            void poll(generation);
        },

        stop(): void {
            polling = false;
            generation++;
            if (timerId !== null) {
                clearTimeout(timerId);
                timerId = null;
            }
        },

        setInterval(ms: number): void {
            interval = clampInterval(ms);
        },

        setTickers(newTickers: string[]): void {
            tickers = newTickers.map((t) => t.toUpperCase());
        },

        isPolling(): boolean {
            return polling;
        },
    };
}
