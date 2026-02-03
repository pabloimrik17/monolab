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

export function createQuotePoller(
    client: FinnhubClient,
    options: QuotePollerOptions
): QuotePoller {
    let interval = clampInterval(options.interval ?? DEFAULT_INTERVAL);
    let tickers: string[] = [];
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let polling = false;

    const { onUpdate, onError } = options;

    function clampInterval(ms: number): number {
        return Math.min(Math.max(ms, MIN_INTERVAL), MAX_INTERVAL);
    }

    async function poll(): Promise<void> {
        if (tickers.length === 0) {
            return;
        }

        try {
            const quotes = await client.getQuotes(tickers);
            onUpdate(quotes);
        } catch (error) {
            onError?.(
                error instanceof Error ? error : new Error(String(error))
            );
        }

        if (polling) {
            timerId = setTimeout(() => void poll(), interval);
        }
    }

    return {
        start(initialTickers: string[]): void {
            if (polling) {
                return;
            }

            tickers = initialTickers.map((t) => t.toUpperCase());
            polling = true;

            void poll();
        },

        stop(): void {
            polling = false;
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
