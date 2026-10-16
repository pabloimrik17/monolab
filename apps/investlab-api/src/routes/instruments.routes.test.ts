import { describe, expect, it } from "vitest";
import { instrumentDtoSchema } from "@m0n0lab/investlab-portfolio";
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
