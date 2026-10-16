import { describe, expect, it } from "vitest";
import { QUOTE_LIST_MAX_SYMBOLS } from "@m0n0lab/investlab-quotes";
import { createRouteQuoteSource } from "./route-quote-source";

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

        const quotes = await createRouteQuoteSource(fetchFn).getQuotes(symbols);

        expect([...quotes.keys()]).toEqual(["AAPL", "MSFT"]);
    });

    it("leaves out symbols the route would reject and still asks for the rest", async () => {
        const { requests, fetchFn } = recordingFetch(Response.json([]));

        await createRouteQuoteSource(fetchFn).getQuotes(["AAPL", "NOT A TICKER", "aapl", "MSFT"]);

        expect(requests).toEqual(["/api/quotes?symbols=AAPL%2CMSFT"]);
    });

    it("does not call the route when no symbol is valid", async () => {
        const { requests, fetchFn } = recordingFetch(Response.json([]));

        const quotes = await createRouteQuoteSource(fetchFn).getQuotes(["NOT A TICKER"]);

        expect(requests).toEqual([]);
        expect(quotes.size).toBe(0);
    });

    it("returns the quotes the route answered, keyed by symbol", async () => {
        const { fetchFn } = recordingFetch(Response.json([AAPL]));

        const quotes = await createRouteQuoteSource(fetchFn).getQuotes(["AAPL", "MSFT"]);

        expect([...quotes.keys()]).toEqual(["AAPL"]);
        expect(quotes.get("AAPL")).toEqual({ ...AAPL, updatedAt: new Date(AAPL.updatedAt) });
    });

    it("fails when the route answers with an error status", async () => {
        const { fetchFn } = recordingFetch(
            Response.json({ message: "unavailable" }, { status: 503 }),
        );

        await expect(createRouteQuoteSource(fetchFn).getQuotes(["AAPL"])).rejects.toThrow(
            "Quotes request failed: HTTP 503",
        );
    });

    it("fails when the route answers with something other than quotes", async () => {
        const { fetchFn } = recordingFetch(Response.json([{ symbol: "AAPL" }]));

        await expect(createRouteQuoteSource(fetchFn).getQuotes(["AAPL"])).rejects.toThrow();
    });
});
