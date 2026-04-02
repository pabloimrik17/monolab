import {
    createFinnhubClient,
    createQuotePoller,
    createTickerStore,
    type FinnhubClient,
    type Quote,
    type QuotePoller,
} from "@m0n0lab/wealth-tracker-core";

export const tickerStore = createTickerStore(window.localStorage);

let finnhubClient: FinnhubClient | null = null;

function getFinnhubClient(): FinnhubClient {
    if (finnhubClient === null) {
        finnhubClient = createFinnhubClient(import.meta.env.VITE_FINNHUB_API_KEY);
    }
    return finnhubClient;
}

export function createPoller(
    onUpdate: (quotes: Map<string, Quote>) => void,
    onError?: (error: Error) => void,
): QuotePoller {
    return createQuotePoller(getFinnhubClient(), {
        interval: 30_000,
        onUpdate,
        onError,
    });
}

export type { Quote, Ticker } from "@m0n0lab/wealth-tracker-core";
