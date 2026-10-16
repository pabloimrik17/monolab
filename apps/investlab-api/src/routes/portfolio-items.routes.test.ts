import { describe, expect, it } from "vitest";
import { apiErrorDtoSchema, PersistenceError } from "@m0n0lab/investlab-core";
import {
    portfolioItemDtoSchema,
    portfolioItemListDtoSchema,
} from "@m0n0lab/investlab-data-contracts";
import { PortfolioItem } from "@m0n0lab/investlab-domain";
import { makeInstrument } from "../testing/in-memory-portfolio.ts";
import { createTestApp } from "../testing/test-app.ts";

const MISSING_ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

async function seedItem(ctx: ReturnType<typeof createTestApp>, broker = "MyInvestor") {
    const instrument = makeInstrument();
    ctx.instruments.store.set(instrument.id, instrument);
    const created = PortfolioItem.create({ instrumentId: instrument.id, broker, targetWeight: 10 });
    if (created.isErr()) throw created.error;
    ctx.items.store.set(created.value.id, created.value);
    return { instrument, item: created.value };
}

describe("portfolio item routes", () => {
    describe("auth", () => {
        it("rejects every portfolio item route without a token", async () => {
            const { app } = createTestApp();

            const responses = await Promise.all([
                app.request("/portfolio-items"),
                app.request("/portfolio-items", { method: "POST" }),
                app.request(`/portfolio-items/${MISSING_ID}`, { method: "PUT" }),
                app.request(`/portfolio-items/${MISSING_ID}`, { method: "DELETE" }),
            ]);

            expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401]);
        });
    });

    describe("GET /portfolio-items", () => {
        it("lists items with their instrument and the catalog", async () => {
            const ctx = createTestApp();
            const { instrument, item } = await seedItem(ctx);
            const spare = makeInstrument("VTI");
            ctx.instruments.store.set(spare.id, spare);

            const res = await ctx.request("/portfolio-items");

            expect(res.status).toBe(200);
            const body = portfolioItemListDtoSchema.parse(await res.json());
            expect(body.items).toHaveLength(1);
            expect(body.items[0]!.item.id).toBe(item.id);
            expect(body.items[0]!.item.createdAt).toBe(item.createdAt.toISOString());
            expect(body.items[0]!.instrument.symbol).toBe(instrument.symbol);
            expect(body.instruments.map((i) => i.symbol).sort()).toEqual(["SPY", "VTI"]);
        });

        it("answers an empty portfolio", async () => {
            const res = await createTestApp().request("/portfolio-items");

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ items: [], instruments: [] });
        });

        it("hides persistence failures behind a generic 500", async () => {
            const ctx = createTestApp();
            ctx.items.failure = new PersistenceError(new Error("db down"));

            const res = await ctx.request("/portfolio-items");

            expect(res.status).toBe(500);
            expect(apiErrorDtoSchema.parse(await res.json())).toEqual({
                code: "PERSISTENCE_ERROR",
                message: "Internal server error",
                statusCode: 500,
            });
        });
    });

    describe("POST /portfolio-items", () => {
        it("creates an item and answers 201 with its DTO", async () => {
            const ctx = createTestApp();
            const instrument = makeInstrument();
            ctx.instruments.store.set(instrument.id, instrument);

            const res = await ctx.json("/portfolio-items", "POST", {
                instrumentId: instrument.id,
                broker: "MyInvestor",
                targetWeight: 25,
                currentValue: 1500,
                notes: "core",
            });

            expect(res.status).toBe(201);
            const body = portfolioItemDtoSchema.parse(await res.json());
            expect(body).toMatchObject({
                instrumentId: instrument.id,
                broker: "MyInvestor",
                targetWeight: 25,
                currentValue: 1500,
                notes: "core",
            });
            expect(ctx.items.store.has(body.id)).toBe(true);
        });

        it("defaults currentValue to 0 when omitted", async () => {
            const ctx = createTestApp();
            const instrument = makeInstrument();
            ctx.instruments.store.set(instrument.id, instrument);

            const res = await ctx.json("/portfolio-items", "POST", {
                instrumentId: instrument.id,
                broker: "MyInvestor",
                targetWeight: 25,
            });

            expect(res.status).toBe(201);
            expect(portfolioItemDtoSchema.parse(await res.json()).currentValue).toBe(0);
        });

        it("answers 404 INSTRUMENT_NOT_FOUND for an unknown instrument", async () => {
            const res = await createTestApp().json("/portfolio-items", "POST", {
                instrumentId: MISSING_ID,
                broker: "MyInvestor",
                targetWeight: 25,
            });

            expect(res.status).toBe(404);
            expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("INSTRUMENT_NOT_FOUND");
        });

        it("answers 422 with the failing field path when targetWeight is out of range", async () => {
            const ctx = createTestApp();

            const res = await ctx.json("/portfolio-items", "POST", {
                instrumentId: MISSING_ID,
                broker: "MyInvestor",
                targetWeight: 150,
            });

            expect(res.status).toBe(422);
            const body = apiErrorDtoSchema.parse(await res.json());
            expect(body.code).toBe("VALIDATION_ERROR");
            expect(body.statusCode).toBe(422);
            expect(body.issues).toEqual([
                { path: "targetWeight", message: expect.stringContaining("100") },
            ]);
            expect(ctx.items.store.size).toBe(0);
        });

        it("answers 422 when the body is not valid JSON", async () => {
            const res = await createTestApp().request("/portfolio-items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: "{nope",
            });

            expect(res.status).toBe(422);
            const body = apiErrorDtoSchema.parse(await res.json());
            expect(body.code).toBe("VALIDATION_ERROR");
            expect(body.issues).toEqual([{ path: "", message: expect.any(String) }]);
        });
    });

    describe("PUT /portfolio-items/:id", () => {
        it("updates the item and answers 200 with its DTO", async () => {
            const ctx = createTestApp();
            const { item } = await seedItem(ctx);

            const res = await ctx.json(`/portfolio-items/${item.id}`, "PUT", {
                targetWeight: 25,
                expectedUpdatedAt: item.updatedAt.toISOString(),
            });

            expect(res.status).toBe(200);
            const body = portfolioItemDtoSchema.parse(await res.json());
            expect(body.id).toBe(item.id);
            expect(body.targetWeight).toBe(25);
            expect(body.broker).toBe("MyInvestor");
            expect(ctx.items.store.get(item.id)!.targetWeight).toBe(25);
        });

        it("clears notes when the body sets notes to null", async () => {
            const ctx = createTestApp();
            const { item } = await seedItem(ctx);
            item.update({ notes: "core" })._unsafeUnwrap();

            const res = await ctx.json(`/portfolio-items/${item.id}`, "PUT", {
                notes: null,
                expectedUpdatedAt: item.updatedAt.toISOString(),
            });

            expect(res.status).toBe(200);
            expect(portfolioItemDtoSchema.parse(await res.json())).not.toHaveProperty("notes");
            expect(ctx.items.store.get(item.id)!.notes).toBeUndefined();
        });

        it("keeps notes when the body omits them", async () => {
            const ctx = createTestApp();
            const { item } = await seedItem(ctx);
            item.update({ notes: "core" })._unsafeUnwrap();

            const res = await ctx.json(`/portfolio-items/${item.id}`, "PUT", {
                targetWeight: 25,
                expectedUpdatedAt: item.updatedAt.toISOString(),
            });

            expect(res.status).toBe(200);
            expect(portfolioItemDtoSchema.parse(await res.json()).notes).toBe("core");
        });

        it("answers 404 PORTFOLIO_ITEM_NOT_FOUND for an unknown item", async () => {
            const res = await createTestApp().json(`/portfolio-items/${MISSING_ID}`, "PUT", {
                targetWeight: 25,
                expectedUpdatedAt: new Date().toISOString(),
            });

            expect(res.status).toBe(404);
            expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
        });

        it("answers 422 for an id that is not a UUID", async () => {
            const res = await createTestApp().json("/portfolio-items/not-a-uuid", "PUT", {
                targetWeight: 25,
                expectedUpdatedAt: new Date().toISOString(),
            });

            expect(res.status).toBe(422);
            const body = apiErrorDtoSchema.parse(await res.json());
            expect(body.code).toBe("VALIDATION_ERROR");
            expect(body.issues?.[0]?.path).toBe("id");
        });

        it("answers 422 for an invalid body and leaves the item untouched", async () => {
            const ctx = createTestApp();
            const { item } = await seedItem(ctx);

            const res = await ctx.json(`/portfolio-items/${item.id}`, "PUT", {
                broker: "",
                expectedUpdatedAt: item.updatedAt.toISOString(),
            });

            expect(res.status).toBe(422);
            expect(ctx.items.store.get(item.id)!.broker).toBe("MyInvestor");
        });

        it("answers 409 PORTFOLIO_ITEM_CONFLICT for a stale version and leaves the item untouched", async () => {
            const ctx = createTestApp();
            const { item } = await seedItem(ctx);
            const stale = new Date(item.updatedAt.getTime() - 1).toISOString();

            const res = await ctx.json(`/portfolio-items/${item.id}`, "PUT", {
                targetWeight: 25,
                expectedUpdatedAt: stale,
            });

            expect(res.status).toBe(409);
            expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("PORTFOLIO_ITEM_CONFLICT");
            expect(ctx.items.store.get(item.id)!.targetWeight).toBe(10);
        });

        it("answers 422 when the body omits expectedUpdatedAt", async () => {
            const ctx = createTestApp();
            const { item } = await seedItem(ctx);

            const res = await ctx.json(`/portfolio-items/${item.id}`, "PUT", { targetWeight: 25 });

            expect(res.status).toBe(422);
            const body = apiErrorDtoSchema.parse(await res.json());
            expect(body.code).toBe("VALIDATION_ERROR");
            expect(body.issues?.[0]?.path).toBe("expectedUpdatedAt");
        });
    });

    describe("DELETE /portfolio-items/:id", () => {
        it("deletes the item and answers 204 without a body", async () => {
            const ctx = createTestApp();
            const { item } = await seedItem(ctx);

            const res = await ctx.request(`/portfolio-items/${item.id}`, { method: "DELETE" });

            expect(res.status).toBe(204);
            expect(await res.text()).toBe("");
            expect(ctx.items.store.has(item.id)).toBe(false);
        });

        it("answers 404 PORTFOLIO_ITEM_NOT_FOUND for an unknown item", async () => {
            const res = await createTestApp().request(`/portfolio-items/${MISSING_ID}`, {
                method: "DELETE",
            });

            expect(res.status).toBe(404);
            expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
        });

        it("answers 422 for an id that is not a UUID", async () => {
            const res = await createTestApp().request("/portfolio-items/nope", {
                method: "DELETE",
            });

            expect(res.status).toBe(422);
        });
    });
});
