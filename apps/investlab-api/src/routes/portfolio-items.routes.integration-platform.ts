import { describe, expect, it } from "vitest";
import {
    InstrumentNotFoundError,
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
} from "@m0n0lab/investlab-portfolio";
import { makeInstrument, makePortfolioItem } from "@m0n0lab/investlab-portfolio/testing";
import { PortfolioItemsHarness } from "./portfolio-items.harness.ts";

const MISSING_ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

describe("portfolio item routes", () => {
    it("reject every route without a token", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const responses = await Promise.all([
            api.anonymous("/portfolio-items"),
            api.anonymous("/portfolio-items", { method: "POST" }),
            api.anonymous(`/portfolio-items/${MISSING_ID}`, { method: "PUT" }),
            api.anonymous(`/portfolio-items/${MISSING_ID}`, { method: "DELETE" }),
        ]);

        expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401]);
    });
});

describe("GET /portfolio-items", () => {
    it("lists items with their instrument and the catalog", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const instrument = makeInstrument();
        const spare = makeInstrument({ symbol: "VTI" });
        const item = makePortfolioItem({ instrumentId: instrument.id, notes: "core" });
        const list = api.givenItems({
            items: [{ item, instrument }],
            instruments: [instrument, spare],
        });

        const { status, body } = await api.listItems();

        expect(status).toBe(200);
        expect(body).toMatchObject({
            items: [
                {
                    item: { id: item.id, notes: "core", createdAt: item.createdAt.toISOString() },
                    instrument: { symbol: instrument.symbol },
                },
            ],
            instruments: [{ symbol: "SPY" }, { symbol: "VTI" }],
        });
        expect(list.calls).toEqual([[]]);
    });

    it("answers an empty portfolio", async () => {
        await using api = await PortfolioItemsHarness.launch();
        api.givenItems({ items: [], instruments: [] });

        const { status, body } = await api.listItems();

        expect(status).toBe(200);
        expect(body).toEqual({ items: [], instruments: [] });
    });
});

describe("POST /portfolio-items", () => {
    it("creates an item from the whole body and answers 201 with its DTO", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const instrument = makeInstrument();
        const draft = {
            instrumentId: instrument.id,
            broker: "MyInvestor",
            targetWeight: 25,
            currentValue: 1500,
            notes: "core",
        };
        const create = api.givenCreateSucceeds(makePortfolioItem(draft));

        const { status, body } = await api.createItem(draft);

        expect(status).toBe(201);
        expect(body).toMatchObject(draft);
        expect(create.calls).toEqual([[draft]]);
    });

    it("passes only the fields the body carries, so currentValue defaults to 0", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const draft = { instrumentId: makeInstrument().id, broker: "MyInvestor", targetWeight: 25 };
        const create = api.givenCreateSucceeds(makePortfolioItem(draft));

        const { status, body } = await api.createItem(draft);

        expect(status).toBe(201);
        expect(body).toMatchObject({ currentValue: 0 });
        expect(create.calls).toStrictEqual([[draft]]);
    });

    it("answers 404 INSTRUMENT_NOT_FOUND for an unknown instrument", async () => {
        await using api = await PortfolioItemsHarness.launch();
        api.givenCreateFails(new InstrumentNotFoundError(MISSING_ID));

        const { status, body } = await api.createItem({
            instrumentId: MISSING_ID,
            broker: "MyInvestor",
            targetWeight: 25,
        });

        expect(status).toBe(404);
        expect(body).toMatchObject({ code: "INSTRUMENT_NOT_FOUND" });
    });

    it("answers 422 with the failing field path when targetWeight is out of range", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const { status, body } = await api.createItem({
            instrumentId: MISSING_ID,
            broker: "MyInvestor",
            targetWeight: 150,
        });

        expect(status).toBe(422);
        expect(body).toMatchObject({
            code: "VALIDATION_ERROR",
            statusCode: 422,
            issues: [{ path: "targetWeight", message: expect.stringContaining("100") }],
        });
    });

    it("answers 422 when the body is not valid JSON", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const { status, body } = await api.createItemFromRaw("{nope");

        expect(status).toBe(422);
        expect(body).toMatchObject({
            code: "VALIDATION_ERROR",
            issues: [{ path: "", message: expect.any(String) }],
        });
    });
});

describe("PUT /portfolio-items/:id", () => {
    it("updates the item against the version the caller read and answers 200 with its DTO", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem({ targetWeight: 25 });
        const expectedUpdatedAt = item.updatedAt.toISOString();
        const update = api.givenUpdateSucceeds(item);

        const { status, body } = await api.updateItem(item.id, {
            targetWeight: 25,
            expectedUpdatedAt,
        });

        expect(status).toBe(200);
        expect(body).toMatchObject({ id: item.id, targetWeight: 25, broker: "MyInvestor" });
        expect(update.calls).toStrictEqual([
            [item.id, { targetWeight: 25 }, new Date(expectedUpdatedAt)],
        ]);
    });

    it("clears notes when the body sets them to null", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem();
        const update = api.givenUpdateSucceeds(item);

        const { status, body } = await api.updateItem(item.id, {
            notes: null,
            expectedUpdatedAt: item.updatedAt.toISOString(),
        });

        expect(status).toBe(200);
        expect(body).not.toHaveProperty("notes");
        expect(update.calls[0]![1]).toStrictEqual({ notes: undefined });
    });

    it("passes every changed field and keeps notes when the body omits them", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem({ notes: "core" });
        const update = api.givenUpdateSucceeds(item);

        const { status, body } = await api.updateItem(item.id, {
            broker: "Degiro",
            targetWeight: 25,
            currentValue: 10,
            expectedUpdatedAt: item.updatedAt.toISOString(),
        });

        expect(status).toBe(200);
        expect(body).toMatchObject({ notes: "core" });
        expect(update.calls[0]![1]).toStrictEqual({
            broker: "Degiro",
            targetWeight: 25,
            currentValue: 10,
        });
    });

    it("answers 404 PORTFOLIO_ITEM_NOT_FOUND for an unknown item", async () => {
        await using api = await PortfolioItemsHarness.launch();
        api.givenUpdateFails(new PortfolioItemNotFoundError(MISSING_ID));

        const { status, body } = await api.updateItem(MISSING_ID, {
            targetWeight: 25,
            expectedUpdatedAt: new Date().toISOString(),
        });

        expect(status).toBe(404);
        expect(body).toMatchObject({ code: "PORTFOLIO_ITEM_NOT_FOUND" });
    });

    it("answers 422 for an id that is not a UUID", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const { status, body } = await api.updateItem("not-a-uuid", {
            targetWeight: 25,
            expectedUpdatedAt: new Date().toISOString(),
        });

        expect(status).toBe(422);
        expect(body).toMatchObject({ code: "VALIDATION_ERROR", issues: [{ path: "id" }] });
    });

    it("answers 422 for an invalid body without reaching the use case", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem();
        const update = api.givenUpdateSucceeds(item);

        const { status } = await api.updateItem(item.id, {
            broker: "",
            expectedUpdatedAt: item.updatedAt.toISOString(),
        });

        expect(status).toBe(422);
        expect(update.calls).toEqual([]);
    });

    it("answers 409 PORTFOLIO_ITEM_CONFLICT for a stale version", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem();
        api.givenUpdateFails(new PortfolioItemConflictError(item.id));
        const stale = new Date(item.updatedAt.getTime() - 1).toISOString();

        const { status, body } = await api.updateItem(item.id, {
            targetWeight: 25,
            expectedUpdatedAt: stale,
        });

        expect(status).toBe(409);
        expect(body).toMatchObject({ code: "PORTFOLIO_ITEM_CONFLICT" });
    });

    it("answers 422 when the body omits expectedUpdatedAt", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const { status, body } = await api.updateItem(MISSING_ID, { targetWeight: 25 });

        expect(status).toBe(422);
        expect(body).toMatchObject({
            code: "VALIDATION_ERROR",
            issues: [{ path: "expectedUpdatedAt" }],
        });
    });
});

describe("DELETE /portfolio-items/:id", () => {
    it("deletes the item and answers 204 without a body", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem();
        const remove = api.givenDeleteSucceeds();

        const { status, body } = await api.deleteItem(item.id);

        expect(status).toBe(204);
        expect(body).toBeUndefined();
        expect(remove.calls).toEqual([[item.id]]);
    });

    it("answers 404 PORTFOLIO_ITEM_NOT_FOUND for an unknown item", async () => {
        await using api = await PortfolioItemsHarness.launch();
        api.givenDeleteFails(new PortfolioItemNotFoundError(MISSING_ID));

        const { status, body } = await api.deleteItem(MISSING_ID);

        expect(status).toBe(404);
        expect(body).toMatchObject({ code: "PORTFOLIO_ITEM_NOT_FOUND" });
    });

    it("answers 422 for an id that is not a UUID", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const { status } = await api.deleteItem("nope");

        expect(status).toBe(422);
    });
});
