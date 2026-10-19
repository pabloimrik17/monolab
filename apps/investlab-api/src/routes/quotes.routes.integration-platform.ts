import { describe, expect, it } from "vitest";
import { QUOTE_LIST_MAX_SYMBOLS } from "@m0n0lab/investlab-quotes";
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

        const { status, body } = await api.listQuotes(["aapl", "MSFT", "AAPL"]);

        expect(status).toBe(200);
        expect(body).toEqual([{ ...aapl, updatedAt: "2026-10-12T14:30:00.000Z" }]);
        expect(list.calls).toEqual([[["AAPL", "MSFT"]]]);
    });

    it("answers 422 VALIDATION_ERROR without a symbols parameter", async () => {
        await using api = await QuotesHarness.launch();

        const { status, body } = await api.listQuotes();

        expect(status).toBe(422);
        expect(body).toMatchObject({ code: "VALIDATION_ERROR", issues: [{ path: "symbols" }] });
    });

    it("answers 422 VALIDATION_ERROR for more symbols than the maximum, without fetching", async () => {
        await using api = await QuotesHarness.launch();
        const list = api.givenQuotes([]);
        const symbols = Array.from({ length: QUOTE_LIST_MAX_SYMBOLS + 1 }, (_, i) => `S${i}`);

        const { status, body } = await api.listQuotes(symbols);

        expect(status).toBe(422);
        expect(body).toMatchObject({ code: "VALIDATION_ERROR" });
        expect(list.calls).toEqual([]);
    });

    it("answers 422 VALIDATION_ERROR for a malformed symbol, without fetching", async () => {
        await using api = await QuotesHarness.launch();
        const list = api.givenQuotes([]);

        const { status, body } = await api.listQuotes(["AAPL", "BAD SYMBOL"]);

        expect(status).toBe(422);
        expect(body).toMatchObject({ issues: [{ path: "symbols.1" }] });
        expect(list.calls).toEqual([]);
    });
});
