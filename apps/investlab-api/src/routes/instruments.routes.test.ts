import { describe, expect, it } from "vitest";
import { apiErrorDtoSchema } from "@m0n0lab/investlab-core";
import { instrumentDtoSchema, PortfolioItem } from "@m0n0lab/investlab-portfolio";
import { makeInstrument } from "../testing/in-memory-portfolio.ts";
import { createTestApp } from "../testing/test-app.ts";

describe("GET /instruments", () => {
    it("rejects a request without a token", async () => {
        const res = await createTestApp().app.request("/instruments");

        expect(res.status).toBe(401);
    });

    it("lists the instrument catalog as DTOs", async () => {
        const ctx = createTestApp();
        const instrument = makeInstrument("VTI");
        ctx.instruments.store.set(instrument.id, instrument);

        const res = await ctx.request("/instruments");

        expect(res.status).toBe(200);
        const body = instrumentDtoSchema.array().parse(await res.json());
        expect(body).toEqual([
            {
                id: instrument.id,
                symbol: "VTI",
                name: "VTI fund",
                type: "etf",
                assetClass: "equity",
                quotable: true,
            },
        ]);
    });

    it("answers an empty catalog", async () => {
        const res = await createTestApp().request("/instruments");

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual([]);
    });
});

const MISSING_ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

function seedInstrument(ctx: ReturnType<typeof createTestApp>, symbol = "VTI") {
    const instrument = makeInstrument(symbol);
    ctx.instruments.store.set(instrument.id, instrument);
    return instrument;
}

describe("instrument management routes", () => {
    it("rejects every instrument management route without a token", async () => {
        const { app } = createTestApp();

        const responses = await Promise.all([
            app.request("/instruments", { method: "POST" }),
            app.request(`/instruments/${MISSING_ID}`, { method: "PUT" }),
            app.request(`/instruments/${MISSING_ID}`, { method: "DELETE" }),
        ]);

        expect(responses.map((r) => r.status)).toEqual([401, 401, 401]);
    });

    describe("POST /instruments", () => {
        it("creates the instrument with its symbol in capitals and answers 201", async () => {
            const ctx = createTestApp();

            const res = await ctx.json("/instruments", "POST", {
                symbol: "vwce",
                name: "Vanguard FTSE All-World",
                type: "etf",
                assetClass: "equity",
                replicates: "FTSE All-World",
            });

            expect(res.status).toBe(201);
            const body = instrumentDtoSchema.parse(await res.json());
            expect(body).toMatchObject({
                symbol: "VWCE",
                replicates: "FTSE All-World",
                quotable: true,
            });
            expect(ctx.instruments.store.has(body.id)).toBe(true);
        });

        it("answers 409 INSTRUMENT_ALREADY_EXISTS for a symbol in the catalog", async () => {
            const ctx = createTestApp();
            seedInstrument(ctx, "AAPL");

            const res = await ctx.json("/instruments", "POST", {
                symbol: "AAPL",
                name: "Apple Inc.",
                type: "stock",
                assetClass: "equity",
            });

            expect(res.status).toBe(409);
            expect(apiErrorDtoSchema.parse(await res.json()).code).toBe(
                "INSTRUMENT_ALREADY_EXISTS",
            );
            expect(ctx.instruments.store.size).toBe(1);
        });

        it("answers 422 with the failing field path for an unknown type", async () => {
            const res = await createTestApp().json("/instruments", "POST", {
                symbol: "VWCE",
                name: "Vanguard FTSE All-World",
                type: "warrant",
                assetClass: "equity",
            });

            expect(res.status).toBe(422);
            const body = apiErrorDtoSchema.parse(await res.json());
            expect(body.code).toBe("VALIDATION_ERROR");
            expect(body.issues?.map(({ path }) => path)).toEqual(["type"]);
        });
    });

    describe("PUT /instruments/:id", () => {
        it("sets the name, keeps the other fields and answers 200", async () => {
            const ctx = createTestApp();
            const instrument = seedInstrument(ctx);

            const res = await ctx.json(`/instruments/${instrument.id}`, "PUT", {
                name: "Vanguard Total Market",
            });

            expect(res.status).toBe(200);
            expect(instrumentDtoSchema.parse(await res.json())).toEqual({
                id: instrument.id,
                symbol: "VTI",
                name: "Vanguard Total Market",
                type: "etf",
                assetClass: "equity",
                quotable: true,
            });
        });

        it("clears the tracked index when the body sets it to null", async () => {
            const ctx = createTestApp();
            const instrument = seedInstrument(ctx);
            instrument.update({ replicates: "CRSP US Total Market" })._unsafeUnwrap();

            const res = await ctx.json(`/instruments/${instrument.id}`, "PUT", {
                replicates: null,
            });

            expect(res.status).toBe(200);
            expect(instrumentDtoSchema.parse(await res.json())).not.toHaveProperty("replicates");
        });

        it("answers 409 INSTRUMENT_ALREADY_EXISTS and keeps the catalog for a taken symbol", async () => {
            const ctx = createTestApp();
            const instrument = seedInstrument(ctx);
            seedInstrument(ctx, "VWCE");

            const res = await ctx.json(`/instruments/${instrument.id}`, "PUT", {
                symbol: "VWCE",
            });

            expect(res.status).toBe(409);
            expect(apiErrorDtoSchema.parse(await res.json()).code).toBe(
                "INSTRUMENT_ALREADY_EXISTS",
            );
            expect(ctx.instruments.store.get(instrument.id)!.symbol).toBe("VTI");
        });

        it("answers 404 INSTRUMENT_NOT_FOUND for an unknown instrument", async () => {
            const res = await createTestApp().json(`/instruments/${MISSING_ID}`, "PUT", {
                name: "Nothing",
            });

            expect(res.status).toBe(404);
            expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("INSTRUMENT_NOT_FOUND");
        });

        it("answers 422 for an id that is not a UUID", async () => {
            const res = await createTestApp().json("/instruments/not-a-uuid", "PUT", {
                name: "Nothing",
            });

            expect(res.status).toBe(422);
            expect(apiErrorDtoSchema.parse(await res.json()).issues?.[0]?.path).toBe("id");
        });
    });

    describe("DELETE /instruments/:id", () => {
        it("removes an unused instrument and answers 204 without a body", async () => {
            const ctx = createTestApp();
            const instrument = seedInstrument(ctx);

            const res = await ctx.request(`/instruments/${instrument.id}`, { method: "DELETE" });

            expect(res.status).toBe(204);
            expect(await res.text()).toBe("");
            expect(ctx.instruments.store.has(instrument.id)).toBe(false);
        });

        it("answers 409 INSTRUMENT_IN_USE while a portfolio item references it", async () => {
            const ctx = createTestApp();
            const instrument = seedInstrument(ctx);
            const item = PortfolioItem.create({
                instrumentId: instrument.id,
                broker: "MyInvestor",
                targetWeight: 10,
            })._unsafeUnwrap();
            ctx.items.store.set(item.id, item);

            const res = await ctx.request(`/instruments/${instrument.id}`, { method: "DELETE" });

            expect(res.status).toBe(409);
            expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("INSTRUMENT_IN_USE");
            expect(ctx.instruments.store.has(instrument.id)).toBe(true);
        });
    });
});
