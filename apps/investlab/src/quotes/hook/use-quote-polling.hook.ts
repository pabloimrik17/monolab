import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { QuotesRequestError } from "#quotes/error/quotes-request.error";
import {
    QUOTE_LIST_MAX_SYMBOLS,
    quoteDtoSchema,
    quoteSymbolSchema,
    type Quote,
} from "@m0n0lab/investlab-quotes";

const MIN_INTERVAL = 15_000;
const MAX_INTERVAL = 60_000;
const DEFAULT_INTERVAL = 30_000;

export interface QuotePollerOptions {
    interval?: number;
    onUpdate: (quotes: Map<string, Quote>) => void;
    onError?: (error: QuotesRequestError) => void;
}

export interface QuotePoller {
    start(tickers: string[]): void;
    stop(): void;
    setInterval(ms: number): void;
    setTickers(tickers: string[]): void;
    isPolling(): boolean;
}

export interface QuoteSource {
    getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, QuotesRequestError>;
}

export function createQuotePoller(client: QuoteSource, options: QuotePollerOptions): QuotePoller {
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
        const isCurrent = () => polling && pollGeneration === generation;

        const result = tickers.length > 0 ? await client.getQuotes(tickers) : null;

        // Scheduled before the callbacks so one that throws cannot end polling.
        if (isCurrent()) {
            timerId = setTimeout(() => void poll(pollGeneration), interval);
        }

        result?.match(
            (quotes) => {
                if (isCurrent()) onUpdate(quotes);
            },
            (error) => {
                if (isCurrent()) onError?.(error);
            },
        );
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

const QUOTES_ROUTE = "/api/quotes";
const quoteListSchema = z.array(quoteDtoSchema);

/** Quotes from the web app's own resource route; the browser never talks to Finnhub or the API. */
export function createRouteQuoteSource(fetchFn: typeof fetch = fetch): QuoteSource {
    const request = ResultAsync.fromThrowable(
        fetchFn,
        (cause) => new QuotesRequestError("Quotes request failed: route unreachable", cause),
    );

    function fetchChunk(symbols: string[]): ResultAsync<Quote[], QuotesRequestError> {
        const query = new URLSearchParams({ symbols: symbols.join(",") });

        return request(`${QUOTES_ROUTE}?${query}`)
            .andThen((response) => {
                if (!response.ok) {
                    return errAsync(
                        new QuotesRequestError(`Quotes request failed: HTTP ${response.status}`),
                    );
                }
                return ResultAsync.fromPromise(
                    response.json() as Promise<unknown>,
                    (cause) => new QuotesRequestError("Quotes response is not JSON", cause),
                );
            })
            .andThen((body) => {
                const parsed = quoteListSchema.safeParse(body);
                return parsed.success
                    ? okAsync(parsed.data)
                    : errAsync(
                          new QuotesRequestError(
                              "Quotes response has an unexpected shape",
                              parsed.error,
                          ),
                      );
            })
            .map((dtos) => dtos.map((dto) => ({ ...dto, updatedAt: new Date(dto.updatedAt) })));
    }

    return {
        getQuotes(symbols: string[]): ResultAsync<Map<string, Quote>, QuotesRequestError> {
            const requestable = [
                ...new Set(
                    symbols
                        .filter((symbol) => quoteSymbolSchema.safeParse(symbol).success)
                        .map((symbol) => symbol.toUpperCase()),
                ),
            ];

            const chunks: string[][] = [];
            for (let start = 0; start < requestable.length; start += QUOTE_LIST_MAX_SYMBOLS) {
                chunks.push(requestable.slice(start, start + QUOTE_LIST_MAX_SYMBOLS));
            }

            return ResultAsync.combine(chunks.map(fetchChunk)).map(
                (answers) => new Map(answers.flat().map((quote) => [quote.symbol, quote])),
            );
        },
    };
}

/** Quotes of the tickers, refreshed from the quotes route while any is followed; polls only after mount. */
export function useQuotePolling(tickers: readonly { symbol: string }[]) {
    const [quotes, setQuotes] = useState<Map<string, Quote>>(new Map());
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const pollerRef = useRef<QuotePoller | null>(null);

    useEffect(() => {
        const poller = createQuotePoller(createRouteQuoteSource(), {
            onUpdate: (newQuotes) => {
                setQuotes(newQuotes);
                setLastUpdate(new Date());
            },
            onError: (error) => {
                console.error("Quote polling error:", error);
            },
        });
        pollerRef.current = poller;

        return () => {
            poller.stop();
            setIsPolling(false);
        };
    }, []);

    useEffect(() => {
        const poller = pollerRef.current;
        if (!poller) return;

        const symbols = tickers.map((t) => t.symbol);

        if (symbols.length === 0) {
            poller.stop();
            setIsPolling(false);
        } else if (poller.isPolling()) {
            poller.setTickers(symbols);
        } else {
            poller.start(symbols);
            setIsPolling(true);
        }
    }, [tickers]);

    return { quotes, lastUpdate, isPolling };
}
