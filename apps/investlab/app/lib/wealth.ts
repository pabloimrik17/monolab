// Legacy ticker list: the browser still calls Finnhub directly until tasks §12.3 adds the web quotes resource route.
import {
    createFinnhubQuoteDatasource,
    type FinnhubQuoteDatasource,
} from "@m0n0lab/investlab-data-server/finnhub";
import { createQuotePoller, type QuotePoller } from "../ticker/quote-poller";
import { createTickerStore, type TickerStore } from "../ticker/ticker-store";
import type { Quote } from "../ticker/types";

let tickerStoreInstance: TickerStore | null = null;
let finnhubClient: FinnhubQuoteDatasource | null = null;

export function getTickerStore(): TickerStore {
    if (tickerStoreInstance === null) {
        tickerStoreInstance = createTickerStore(window.localStorage);
    }
    return tickerStoreInstance;
}

function getFinnhubClient(): FinnhubQuoteDatasource {
    if (finnhubClient === null) {
        finnhubClient = createFinnhubQuoteDatasource(import.meta.env.VITE_FINNHUB_API_KEY);
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

export type { Quote, Ticker } from "../ticker/types";
