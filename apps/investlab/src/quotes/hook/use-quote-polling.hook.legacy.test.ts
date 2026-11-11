import { err, errAsync, ok, okAsync, ResultAsync, type Result } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { QuotesRequestError } from "#quotes/error/quotes-request.error";
import { QUOTE_LIST_MAX_SYMBOLS, type Quote } from "@m0n0lab/investlab-quotes";
import {
    createQuotePoller,
    createRouteQuoteSource,
    type QuoteSource,
} from "./use-quote-polling.hook";

function createMockClient(): QuoteSource & { getQuotes: Mock } {
    return {
        getQuotes: vi.fn().mockReturnValue(okAsync(new Map())),
    };
}

function createMockQuote(symbol: string): Quote {
    return {
        symbol,
        price: 100,
        change: 1,
        changePercent: 1,
        updatedAt: new Date(),
    };
}

describe("use-quote-polling.hook", () => {
    describe("createQuotePoller", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("immediately fetches quotes on start", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL", "MSFT"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(client.getQuotes).toHaveBeenCalledWith(["AAPL", "MSFT"]);
            poller.stop();
        });

        it("calls onUpdate with fetched quotes", async () => {
            const client = createMockClient();
            const quotes = new Map([
                ["AAPL", createMockQuote("AAPL")],
                ["MSFT", createMockQuote("MSFT")],
            ]);
            client.getQuotes.mockReturnValue(okAsync(quotes));

            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL", "MSFT"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(onUpdate).toHaveBeenCalledWith(quotes);
            poller.stop();
        });

        it("does not fetch if ticker list is empty", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start([]);
            await vi.advanceTimersByTimeAsync(0);

            expect(client.getQuotes).not.toHaveBeenCalled();
            expect(onUpdate).not.toHaveBeenCalled();
            poller.stop();
        });

        it("normalizes tickers to uppercase", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["aapl", "msft"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(client.getQuotes).toHaveBeenCalledWith(["AAPL", "MSFT"]);
            poller.stop();
        });

        it("does nothing if already polling", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL"]);
            poller.start(["MSFT"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(client.getQuotes).toHaveBeenCalledTimes(1);
            expect(client.getQuotes).toHaveBeenCalledWith(["AAPL"]);
            poller.stop();
        });

        it("stops polling", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            poller.stop();

            expect(poller.isPolling()).toBe(false);
        });

        it("does not error if not polling", () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            expect(() => poller.stop()).not.toThrow();
        });

        it("prevents subsequent fetches", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            poller.stop();

            client.getQuotes.mockClear();
            await vi.advanceTimersByTimeAsync(30000);

            expect(client.getQuotes).not.toHaveBeenCalled();
        });

        it("invalidates in-flight poll when stop then start is called", async () => {
            const client = createMockClient();
            let resolveFirst: (value: Map<string, Quote>) => void;
            const firstCall: ResultAsync<Map<string, Quote>, QuotesRequestError> = new ResultAsync(
                new Promise((r) => {
                    resolveFirst = (quotes) => r(ok(quotes));
                }),
            );

            const msftQuotes = new Map([["MSFT", createMockQuote("MSFT")]]);
            client.getQuotes.mockReturnValueOnce(firstCall).mockReturnValue(okAsync(msftQuotes));

            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            poller.start(["AAPL"]);

            poller.stop();
            poller.start(["MSFT"]);
            await vi.advanceTimersByTimeAsync(0);

            resolveFirst!(new Map([["AAPL", createMockQuote("AAPL")]]));
            await vi.advanceTimersByTimeAsync(0);

            expect(onUpdate).toHaveBeenCalledTimes(1);
            expect(onUpdate).toHaveBeenCalledWith(msftQuotes);
            poller.stop();
        });

        it("changes polling interval", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 30000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            client.getQuotes.mockClear();

            poller.setInterval(20000);
            // the in-flight timer was armed with the old 30s interval
            await vi.advanceTimersByTimeAsync(30000);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);

            client.getQuotes.mockClear();
            await vi.advanceTimersByTimeAsync(20000);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);
            poller.stop();
        });

        it("clamps interval to minimum 15s", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.setInterval(5000);
            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            client.getQuotes.mockClear();

            await vi.advanceTimersByTimeAsync(14999);
            expect(client.getQuotes).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);
            poller.stop();
        });

        it("clamps interval to maximum 60s", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.setInterval(120000);
            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            client.getQuotes.mockClear();

            await vi.advanceTimersByTimeAsync(60000);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(60000);
            expect(client.getQuotes).toHaveBeenCalledTimes(2);
        });

        it("updates ticker list for next poll", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);

            poller.setTickers(["GOOGL", "TSLA"]);
            await vi.advanceTimersByTimeAsync(15000);

            expect(client.getQuotes).toHaveBeenLastCalledWith(["GOOGL", "TSLA"]);
        });

        it("normalizes new tickers to uppercase", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);

            poller.setTickers(["googl", "tsla"]);
            await vi.advanceTimersByTimeAsync(15000);

            expect(client.getQuotes).toHaveBeenLastCalledWith(["GOOGL", "TSLA"]);
        });

        it("continues polling when tickers become empty and resumes when re-added", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);

            poller.setTickers([]);
            client.getQuotes.mockClear();
            await vi.advanceTimersByTimeAsync(15000);

            expect(client.getQuotes).not.toHaveBeenCalled();
            expect(poller.isPolling()).toBe(true);

            poller.setTickers(["MSFT"]);
            await vi.advanceTimersByTimeAsync(15000);

            expect(client.getQuotes).toHaveBeenCalledWith(["MSFT"]);
            poller.stop();
        });

        it("calls onError on fetch failure", async () => {
            const client = createMockClient();
            const error = new QuotesRequestError("Network error");
            client.getQuotes.mockReturnValue(errAsync(error));

            const onUpdate = vi.fn();
            const onError = vi.fn();
            const poller = createQuotePoller(client, { onUpdate, onError });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(onError).toHaveBeenCalledWith(error);
            poller.stop();
        });

        it("continues polling after error", async () => {
            const client = createMockClient();
            client.getQuotes
                .mockReturnValueOnce(errAsync(new QuotesRequestError("Network error")))
                .mockReturnValue(okAsync(new Map([["AAPL", createMockQuote("AAPL")]])));

            const onUpdate = vi.fn();
            const onError = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                onError,
                interval: 15000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);

            expect(onError).toHaveBeenCalledTimes(1);
            expect(poller.isPolling()).toBe(true);

            await vi.advanceTimersByTimeAsync(15000);
            expect(onUpdate).toHaveBeenCalled();
        });

        it("continues polling after a callback throws", async () => {
            const client = createMockClient();
            client.getQuotes.mockReturnValue(okAsync(new Map([["AAPL", createMockQuote("AAPL")]])));
            const onUpdate = vi
                .fn()
                .mockImplementationOnce(() => {
                    throw new Error("render failed");
                })
                .mockImplementation(() => {});
            const poller = createQuotePoller(client, { onUpdate, interval: 15000 });
            const unhandled = vi.fn();
            process.on("unhandledRejection", unhandled);

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            await vi.advanceTimersByTimeAsync(15000);
            process.off("unhandledRejection", unhandled);

            expect(onUpdate).toHaveBeenCalledTimes(2);
            poller.stop();
        });

        it("does not report an error after stop", async () => {
            const client = createMockClient();
            let reject: () => void;
            client.getQuotes.mockReturnValueOnce(
                new ResultAsync(
                    new Promise<Result<never, QuotesRequestError>>((r) => {
                        reject = () => r(err(new QuotesRequestError("late")));
                    }),
                ),
            );
            const onError = vi.fn();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate, onError });

            poller.start(["AAPL"]);
            poller.stop();
            reject!();
            await vi.advanceTimersByTimeAsync(0);

            expect(onError).not.toHaveBeenCalled();
            expect(onUpdate).not.toHaveBeenCalled();
        });

        it("returns false initially", () => {
            const client = createMockClient();
            const poller = createQuotePoller(client, { onUpdate: vi.fn() });

            expect(poller.isPolling()).toBe(false);
        });

        it("returns true after start", () => {
            const client = createMockClient();
            const poller = createQuotePoller(client, { onUpdate: vi.fn() });

            poller.start(["AAPL"]);

            expect(poller.isPolling()).toBe(true);
        });

        it("returns false after stop", async () => {
            const client = createMockClient();
            const poller = createQuotePoller(client, { onUpdate: vi.fn() });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            poller.stop();

            expect(poller.isPolling()).toBe(false);
        });

        it("polls at configured interval", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, {
                onUpdate,
                interval: 20000,
            });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);

            await vi.advanceTimersByTimeAsync(20000);
            expect(client.getQuotes).toHaveBeenCalledTimes(2);

            await vi.advanceTimersByTimeAsync(20000);
            expect(client.getQuotes).toHaveBeenCalledTimes(3);
        });

        it("uses default interval of 30s", async () => {
            const client = createMockClient();
            const onUpdate = vi.fn();
            const poller = createQuotePoller(client, { onUpdate });

            poller.start(["AAPL"]);
            await vi.advanceTimersByTimeAsync(0);
            client.getQuotes.mockClear();

            await vi.advanceTimersByTimeAsync(29999);
            expect(client.getQuotes).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(1);
            expect(client.getQuotes).toHaveBeenCalledTimes(1);
        });
    });

    const AAPL = {
        symbol: "AAPL",
        price: 190.5,
        change: 1.5,
        changePercent: 0.79,
        updatedAt: "2026-10-12T15:30:00.000Z",
    };

    function recordingFetch(response: Response) {
        const body = response.clone();
        const requests: string[] = [];
        const fetchFn = async (input: RequestInfo | URL): Promise<Response> => {
            requests.push(String(input));
            return body.clone();
        };
        return { requests, fetchFn };
    }

    describe("createRouteQuoteSource", () => {
        it("asks the web quotes route once for every symbol", async () => {
            const { requests, fetchFn } = recordingFetch(Response.json([]));

            await createRouteQuoteSource(fetchFn).getQuotes(["AAPL", "MSFT"]);

            expect(requests).toEqual(["/api/quotes?symbols=AAPL%2CMSFT"]);
        });

        it("splits a long ticker list into requests of at most the maximum symbols", async () => {
            const { requests, fetchFn } = recordingFetch(Response.json([]));
            const symbols = Array.from({ length: QUOTE_LIST_MAX_SYMBOLS + 1 }, (_, i) => `S${i}`);

            await createRouteQuoteSource(fetchFn).getQuotes(symbols);

            const requested = requests.map((url) =>
                new URL(url, "http://web").searchParams.get("symbols")?.split(","),
            );
            expect(requested.map((chunk) => chunk?.length)).toEqual([QUOTE_LIST_MAX_SYMBOLS, 1]);
            expect(requested.flat()).toEqual(symbols);
        });

        it("merges the quotes of every chunk", async () => {
            const MSFT = { ...AAPL, symbol: "MSFT" };
            const answers = [[AAPL], [MSFT]];
            const fetchFn = async (): Promise<Response> => Response.json(answers.shift());
            const symbols = Array.from({ length: QUOTE_LIST_MAX_SYMBOLS + 1 }, (_, i) => `S${i}`);

            const quotes = (
                await createRouteQuoteSource(fetchFn).getQuotes(symbols)
            )._unsafeUnwrap();

            expect([...quotes.keys()]).toEqual(["AAPL", "MSFT"]);
        });

        it("leaves out symbols the route would reject and still asks for the rest", async () => {
            const { requests, fetchFn } = recordingFetch(Response.json([]));

            await createRouteQuoteSource(fetchFn).getQuotes([
                "AAPL",
                "NOT A TICKER",
                "aapl",
                "MSFT",
            ]);

            expect(requests).toEqual(["/api/quotes?symbols=AAPL%2CMSFT"]);
        });

        it("does not call the route when no symbol is valid", async () => {
            const { requests, fetchFn } = recordingFetch(Response.json([]));

            const quotes = (
                await createRouteQuoteSource(fetchFn).getQuotes(["NOT A TICKER"])
            )._unsafeUnwrap();

            expect(requests).toEqual([]);
            expect(quotes.size).toBe(0);
        });

        it("returns the quotes the route answered, keyed by symbol", async () => {
            const { fetchFn } = recordingFetch(Response.json([AAPL]));

            const quotes = (
                await createRouteQuoteSource(fetchFn).getQuotes(["AAPL", "MSFT"])
            )._unsafeUnwrap();

            expect([...quotes.keys()]).toEqual(["AAPL"]);
            expect(quotes.get("AAPL")).toEqual({ ...AAPL, updatedAt: new Date(AAPL.updatedAt) });
        });

        it("fails when the route answers with an error status", async () => {
            const { fetchFn } = recordingFetch(
                Response.json({ message: "unavailable" }, { status: 503 }),
            );

            const result = await createRouteQuoteSource(fetchFn).getQuotes(["AAPL"]);

            expect(result._unsafeUnwrapErr()).toEqual(
                new QuotesRequestError("Quotes request failed: HTTP 503"),
            );
        });

        it("fails when the route answers with something other than quotes", async () => {
            const { fetchFn } = recordingFetch(Response.json([{ symbol: "AAPL" }]));

            const result = await createRouteQuoteSource(fetchFn).getQuotes(["AAPL"]);

            expect(result._unsafeUnwrapErr()).toBeInstanceOf(QuotesRequestError);
        });

        it("fails when the answer is not JSON", async () => {
            const { fetchFn } = recordingFetch(new Response("<html>", { status: 200 }));

            const result = await createRouteQuoteSource(fetchFn).getQuotes(["AAPL"]);

            expect(result._unsafeUnwrapErr().message).toBe("Quotes response is not JSON");
        });

        it("fails when the route cannot be reached", async () => {
            const fetchFn = async (): Promise<Response> => {
                throw new TypeError("fetch failed");
            };

            const result = await createRouteQuoteSource(fetchFn).getQuotes(["AAPL"]);

            expect(result._unsafeUnwrapErr().cause).toBeInstanceOf(TypeError);
        });
    });
});
