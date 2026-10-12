import { HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PersistenceError, TOKENS, type QuoteRepository } from "@m0n0lab/investlab-domain";
import { apiError, createTestContainer, fakeApi, quoteDto, server } from "../testing/api-server.ts";
import type { ApiClientError } from "../api-client-error.ts";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function createRepository() {
    return createTestContainer().get<QuoteRepository<ApiClientError>>(TOKENS.QuoteRepository);
}

describe("HttpQuoteRepository", () => {
    it("requests the symbols and returns quotes keyed by symbol", async () => {
        let requested: string | null = null;
        server.use(
            fakeApi("get", "/quotes", ({ request }) => {
                requested = new URL(request.url).searchParams.get("symbols");
                return HttpResponse.json([quoteDto("AAPL"), quoteDto("MSFT", { price: 410 })]);
            }),
        );

        const quotes = (await createRepository().getQuotes(["AAPL", "MSFT"]))._unsafeUnwrap();

        expect(requested).toBe("AAPL,MSFT");
        expect([...quotes.keys()]).toEqual(["AAPL", "MSFT"]);
        expect(quotes.get("MSFT")).toEqual({
            symbol: "MSFT",
            price: 410,
            change: 1.25,
            changePercent: 1.25,
            updatedAt: new Date("2026-10-12T09:30:00.000Z"),
        });
    });

    it("skips the request for an empty symbol list", async () => {
        // onUnhandledRequest: "error" fails the test if a request goes out
        const quotes = (await createRepository().getQuotes([]))._unsafeUnwrap();

        expect(quotes.size).toBe(0);
    });

    it("omits symbols the API has no quote for", async () => {
        server.use(fakeApi("get", "/quotes", () => HttpResponse.json([quoteDto("AAPL")])));

        const quotes = (await createRepository().getQuotes(["AAPL", "NOPE"]))._unsafeUnwrap();

        expect([...quotes.keys()]).toEqual(["AAPL"]);
    });

    it("getQuote returns the single quote", async () => {
        server.use(fakeApi("get", "/quotes", () => HttpResponse.json([quoteDto("AAPL")])));

        const quote = (await createRepository().getQuote("AAPL"))._unsafeUnwrap();

        expect(quote.symbol).toBe("AAPL");
    });

    it("getQuote fails with PersistenceError when the API has no quote", async () => {
        server.use(fakeApi("get", "/quotes", () => HttpResponse.json([])));

        const error = (await createRepository().getQuote("NOPE"))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PersistenceError);
    });

    it("maps API failures through the error code", async () => {
        server.use(
            fakeApi("get", "/quotes", () =>
                apiError(500, "PERSISTENCE_ERROR", "Internal server error"),
            ),
        );

        const error = (await createRepository().getQuotes(["AAPL"]))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PersistenceError);
    });
});
