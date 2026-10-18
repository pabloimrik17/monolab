import { describe, expect, it, vi } from "vitest";
import { apiErrorDtoSchema, PersistenceError } from "@m0n0lab/investlab-core";
import { QUOTE_LIST_MAX_SYMBOLS, quoteDtoSchema } from "@m0n0lab/investlab-quotes";
import { makeQuote } from "@m0n0lab/investlab-quotes/testing";
import { QuotesHarness } from "./quotes.harness.ts";

describe("GET /quotes", () => {
    it("rejects a request without a token", async () => {
        await using api = await QuotesHarness.launch();

        const res = await api.anonymous("/quotes?symbols=AAPL");

        expect(res.status).toBe(401);
    });

    it("asks for the symbols once, in capitals, and answers the quotes found", async () => {
        await using api = await QuotesHarness.launch();
        const aapl = makeQuote({ symbol: "AAPL" });
        const list = api.givenQuotes([aapl]);

        const res = await api.listQuotes(["aapl", "MSFT", "AAPL"]);

        expect(res.status).toBe(200);
        expect(quoteDtoSchema.array().parse(await res.json())).toEqual([
            { ...aapl, updatedAt: "2026-10-12T14:30:00.000Z" },
        ]);
        expect(list.calls).toEqual([[["AAPL", "MSFT"]]]);
    });

    it("answers 422 VALIDATION_ERROR without a symbols parameter", async () => {
        await using api = await QuotesHarness.launch();

        const res = await api.listQuotes();

        expect(res.status).toBe(422);
        const body = apiErrorDtoSchema.parse(await res.json());
        expect(body.code).toBe("VALIDATION_ERROR");
        expect(body.issues?.[0]?.path).toBe("symbols");
    });

    it("answers 422 VALIDATION_ERROR for more symbols than the maximum, without fetching", async () => {
        await using api = await QuotesHarness.launch();
        const list = api.givenQuotes([]);
        const symbols = Array.from({ length: QUOTE_LIST_MAX_SYMBOLS + 1 }, (_, i) => `S${i}`);

        const res = await api.listQuotes(symbols);

        expect(res.status).toBe(422);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("VALIDATION_ERROR");
        expect(list.calls).toEqual([]);
    });

    it("answers 422 VALIDATION_ERROR for a malformed symbol, without fetching", async () => {
        await using api = await QuotesHarness.launch();
        const list = api.givenQuotes([]);

        const res = await api.listQuotes(["AAPL", "BAD SYMBOL"]);

        expect(res.status).toBe(422);
        expect(apiErrorDtoSchema.parse(await res.json()).issues?.[0]?.path).toBe("symbols.1");
        expect(list.calls).toEqual([]);
    });

    it("answers 500 with a generic message when quotes cannot be fetched", async () => {
        await using api = await QuotesHarness.launch();
        vi.spyOn(console, "error").mockImplementation(() => {});
        api.givenQuotesFail(new PersistenceError(new Error("finnhub down")));

        const res = await api.listQuotes(["AAPL"]);

        expect(res.status).toBe(500);
        expect(apiErrorDtoSchema.parse(await res.json())).toEqual({
            code: "PERSISTENCE_ERROR",
            message: "Internal server error",
            statusCode: 500,
        });
    });
});
