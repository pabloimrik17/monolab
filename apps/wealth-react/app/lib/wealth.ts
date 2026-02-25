import {
    createFinnhubClient,
    createQuotePoller,
    createTickerStore,
    type FinnhubClient,
    type Quote,
    type QuotePoller,
} from "@m0n0lab/wealth-tracker-core";

export const tickerStore = createTickerStore(window.localStorage);

export const finnhubClient: FinnhubClient = createFinnhubClient(
    import.meta.env.VITE_FINNHUB_API_KEY
);

export function createPoller(
    onUpdate: (quotes: Map<string, Quote>) => void,
    onError?: (error: Error) => void
): QuotePoller {
    return createQuotePoller(finnhubClient, {
        interval: 30_000,
        onUpdate,
        onError,
    });
}

export type { Quote, Ticker } from "@m0n0lab/wealth-tracker-core";
