import { describe, expect, it } from "vitest";
import { createRouteQuoteSource } from "./route-quote-source";

const AAPL = {
    symbol: "AAPL",
    price: 190.5,
    change: 1.5,
    changePercent: 0.79,
    updatedAt: "2026-10-12T15:30:00.000Z",
};

function recordingFetch(response: Response) {
    const requests: string[] = [];
    const fetchFn = async (input: RequestInfo | URL): Promise<Response> => {
        requests.push(String(input));
        return response;
    };
    return { requests, fetchFn };
}

describe("createRouteQuoteSource", () => {
    it("asks the web quotes route once for every symbol", async () => {
        const { requests, fetchFn } = recordingFetch(Response.json([]));

        await createRouteQuoteSource(fetchFn).getQuotes(["AAPL", "MSFT"]);

        expect(requests).toEqual(["/api/quotes?symbols=AAPL%2CMSFT"]);
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
