import { createQuotePoller, type QuotePoller } from "../ticker/quote-poller";
import { createRouteQuoteSource } from "../ticker/route-quote-source";
import { createTickerStore, type TickerStore } from "../ticker/ticker-store";
import type { Quote } from "../ticker/types";

let tickerStoreInstance: TickerStore | null = null;

export function getTickerStore(): TickerStore {
    if (tickerStoreInstance === null) {
        tickerStoreInstance = createTickerStore(window.localStorage);
    }
    return tickerStoreInstance;
}

export function createPoller(
    onUpdate: (quotes: Map<string, Quote>) => void,
    onError?: (error: Error) => void,
): QuotePoller {
    return createQuotePoller(createRouteQuoteSource(), {
        interval: 30_000,
        onUpdate,
        onError,
    });
}

export type { Quote, Ticker } from "../ticker/types";
