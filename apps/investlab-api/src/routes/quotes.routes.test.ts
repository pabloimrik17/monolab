import { describe, expect, it } from "vitest";
import { apiErrorDtoSchema, PersistenceError } from "@m0n0lab/investlab-core";
import { QUOTE_LIST_MAX_SYMBOLS, quoteDtoSchema } from "@m0n0lab/investlab-data-contracts";
import { createTestApp } from "../testing/test-app.ts";

const AAPL = {
    symbol: "AAPL",
    price: 190.5,
    change: -1.2,
    changePercent: -0.63,
    updatedAt: new Date("2026-10-12T14:30:00.000Z"),
};

describe("GET /quotes", () => {
    it("rejects a request without a token", async () => {
        const res = await createTestApp().app.request("/quotes?symbols=AAPL");

        expect(res.status).toBe(401);
    });

    it("answers the quotes found and omits symbols without data", async () => {
        const ctx = createTestApp();
        ctx.quotes.store.set("AAPL", AAPL);

        const res = await ctx.request("/quotes?symbols=AAPL,MSFT");

        expect(res.status).toBe(200);
        expect(quoteDtoSchema.array().parse(await res.json())).toEqual([
            { ...AAPL, updatedAt: "2026-10-12T14:30:00.000Z" },
        ]);
        expect(ctx.quotes.requested).toEqual([["AAPL", "MSFT"]]);
    });

    it("answers 422 VALIDATION_ERROR without a symbols parameter", async () => {
        const ctx = createTestApp();

        const res = await ctx.request("/quotes");

        expect(res.status).toBe(422);
        const body = apiErrorDtoSchema.parse(await res.json());
        expect(body.code).toBe("VALIDATION_ERROR");
        expect(body.issues?.[0]?.path).toBe("symbols");
        expect(ctx.quotes.requested).toEqual([]);
    });

    it("answers 422 VALIDATION_ERROR for more symbols than the maximum, without fetching", async () => {
        const ctx = createTestApp();
        const symbols = Array.from({ length: QUOTE_LIST_MAX_SYMBOLS + 1 }, (_, i) => `S${i}`);

        const res = await ctx.request(`/quotes?symbols=${symbols.join(",")}`);

        expect(res.status).toBe(422);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("VALIDATION_ERROR");
        expect(ctx.quotes.requested).toEqual([]);
    });

    it("answers 422 VALIDATION_ERROR for a malformed symbol, without fetching", async () => {
        const ctx = createTestApp();

        const res = await ctx.request("/quotes?symbols=AAPL,BAD%20SYMBOL");

        expect(res.status).toBe(422);
        expect(apiErrorDtoSchema.parse(await res.json()).issues?.[0]?.path).toBe("symbols.1");
        expect(ctx.quotes.requested).toEqual([]);
    });

    it("answers 500 with a generic message when quotes cannot be fetched", async () => {
        const ctx = createTestApp();
        ctx.quotes.failure = new PersistenceError(new Error("finnhub down"));

        const res = await ctx.request("/quotes?symbols=AAPL");

        expect(res.status).toBe(500);
        expect(apiErrorDtoSchema.parse(await res.json())).toEqual({
            code: "PERSISTENCE_ERROR",
            message: "Internal server error",
            statusCode: 500,
        });
    });
});
