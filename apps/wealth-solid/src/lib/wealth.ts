import {
    createFinnhubClient,
    createQuotePoller,
    createTickerStore,
    type FinnhubClient,
    type Quote,
    type QuotePoller,
    type TickerStore,
} from "@m0n0lab/wealth-tracker-core";

export interface WealthServices {
    store: TickerStore;
    client: FinnhubClient;
    poller: QuotePoller;
}

export function createWealthServices(
    onUpdate: (quotes: Map<string, Quote>) => void,
    onError?: (error: Error) => void
): WealthServices {
    const store = createTickerStore(localStorage);

    const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_FINNHUB_API_KEY is required");
    }

    const client = createFinnhubClient(apiKey);
    const poller = createQuotePoller(client, {
        interval: 30_000,
        onUpdate,
        onError,
    });

    return { store, client, poller };
}
