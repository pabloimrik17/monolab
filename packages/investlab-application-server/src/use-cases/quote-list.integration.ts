import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { useIntegrationHarness } from "../testing/integration-harness.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { QuoteListUseCase } from "./quote-list.use-case.ts";

const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";

const FINNHUB_QUOTES: Record<string, { c: number; d: number; dp: number }> = {
    AAPL: { c: 190.5, d: 1.5, dp: 0.79 },
    MSFT: { c: 410.25, d: -2.1, dp: -0.51 },
};

/** Symbols Finnhub was asked for, in request order. */
const requestedSymbols: string[] = [];

// Finnhub answers unknown symbols with 200 and an empty quote (`c: 0`, `d`/`dp` null).
const server = setupServer(
    http.get(FINNHUB_QUOTE_URL, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("token") !== "test-finnhub-key") {
            return new HttpResponse(null, { status: 401 });
        }
        const symbol = url.searchParams.get("symbol") ?? "";
        requestedSymbols.push(symbol);
        const quote = FINNHUB_QUOTES[symbol] ?? { c: 0, d: null, dp: null };
        return HttpResponse.json({ ...quote, h: 0, l: 0, o: 0, pc: 0, t: 0 });
    }),
);

describe("QuoteListUseCase", () => {
    const harness = useIntegrationHarness();
    let useCase: QuoteListUseCase;
    beforeAll(() => {
        useCase = harness.get(APP_TOKENS.QuoteListUseCase);
    });

    beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
    afterEach(() => {
        server.resetHandlers();
        requestedSymbols.length = 0;
    });
    afterAll(() => server.close());

    it("fetches uncached symbols from Finnhub", async () => {
        const result = await useCase.execute(["AAPL", "MSFT"]);

        expect(result._unsafeUnwrap()).toEqual([
            {
                symbol: "AAPL",
                price: 190.5,
                change: 1.5,
                changePercent: 0.79,
                updatedAt: expect.any(Date),
            },
            {
                symbol: "MSFT",
                price: 410.25,
                change: -2.1,
                changePercent: -0.51,
                updatedAt: expect.any(Date),
            },
        ]);
        expect(requestedSymbols.toSorted()).toEqual(["AAPL", "MSFT"]);
    });

    it("serves a quote cached in Redis without calling Finnhub again", async () => {
        const [fetched] = (await useCase.execute(["AAPL"]))._unsafeUnwrap();
        server.use(http.get(FINNHUB_QUOTE_URL, () => new HttpResponse(null, { status: 503 })));

        const result = await useCase.execute(["AAPL"]);

        expect(result._unsafeUnwrap()).toEqual([fetched]);
        expect(requestedSymbols).toEqual(["AAPL"]);
    });

    it("normalizes and deduplicates the requested symbols", async () => {
        const result = await useCase.execute([" aapl ", "AAPL", ""]);

        expect(result._unsafeUnwrap().map((quote) => quote.symbol)).toEqual(["AAPL"]);
        expect(requestedSymbols).toEqual(["AAPL"]);
    });

    it("omits symbols Finnhub has no data for, and does not cache them", async () => {
        const result = await useCase.execute(["AAPL", "NOPE"]);
        expect(result._unsafeUnwrap().map((quote) => quote.symbol)).toEqual(["AAPL"]);

        await useCase.execute(["NOPE"]);

        expect(requestedSymbols.filter((symbol) => symbol === "NOPE")).toHaveLength(2);
    });

    it("omits symbols whose Finnhub request fails", async () => {
        server.use(http.get(FINNHUB_QUOTE_URL, () => new HttpResponse(null, { status: 500 })));

        const result = await useCase.execute(["AAPL"]);

        expect(result._unsafeUnwrap()).toEqual([]);
    });
});
