import { describe, expect, it, vi } from "vitest";
import { apiErrorDtoSchema, DomainError, PersistenceError } from "@m0n0lab/investlab-core";
import {
    InstrumentNotFoundError,
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
    portfolioItemDtoSchema,
    portfolioItemListDtoSchema,
} from "@m0n0lab/investlab-portfolio";
import { makeInstrument, makePortfolioItem } from "@m0n0lab/investlab-portfolio/testing";
import { PortfolioItemsHarness } from "./portfolio-items.harness.ts";

const MISSING_ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

const INTERNAL_ERROR = {
    code: "INTERNAL_ERROR",
    message: "Internal server error",
    statusCode: 500,
};

function silenceErrorLog() {
    return vi.spyOn(console, "error").mockImplementation(() => {});
}

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

        const res = await api.listItems();

        expect(res.status).toBe(200);
        const body = portfolioItemListDtoSchema.parse(await res.json());
        expect(body.items).toHaveLength(1);
        expect(body.items[0]!.item.id).toBe(item.id);
        expect(body.items[0]!.item.notes).toBe("core");
        expect(body.items[0]!.item.createdAt).toBe(item.createdAt.toISOString());
        expect(body.items[0]!.instrument.symbol).toBe(instrument.symbol);
        expect(body.instruments.map((i) => i.symbol)).toEqual(["SPY", "VTI"]);
        expect(list.calls).toEqual([[]]);
    });

    it("answers an empty portfolio", async () => {
        await using api = await PortfolioItemsHarness.launch();
        api.givenItems({ items: [], instruments: [] });

        const res = await api.listItems();

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ items: [], instruments: [] });
    });

    it("hides persistence failures behind a generic 500 and logs the cause", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const log = silenceErrorLog();
        const error = new PersistenceError(new Error("db down"));
        api.givenListFails(error);

        const res = await api.listItems();

        expect(res.status).toBe(500);
        expect(apiErrorDtoSchema.parse(await res.json())).toEqual({
            code: "PERSISTENCE_ERROR",
            message: "Internal server error",
            statusCode: 500,
        });
        expect(log).toHaveBeenCalledWith(expect.any(String), error);
    });

    it("hides a use case that throws behind a generic 500", async () => {
        await using api = await PortfolioItemsHarness.launch();
        silenceErrorLog();
        api.givenListThrows(new Error("leaky"));

        const res = await api.listItems();

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual(INTERNAL_ERROR);
    });

    it("hides a domain error the API does not map behind a generic 500", async () => {
        class UnmappedError extends DomainError<"UNMAPPED"> {
            readonly code = "UNMAPPED";
        }
        await using api = await PortfolioItemsHarness.launch();
        silenceErrorLog();
        api.givenListThrows(new UnmappedError("leaky"));

        const res = await api.listItems();

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual(INTERNAL_ERROR);
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

        const res = await api.createItem(draft);

        expect(res.status).toBe(201);
        expect(portfolioItemDtoSchema.parse(await res.json())).toMatchObject(draft);
        expect(create.calls).toEqual([[draft]]);
    });

    it("passes only the fields the body carries, so currentValue defaults to 0", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const draft = { instrumentId: makeInstrument().id, broker: "MyInvestor", targetWeight: 25 };
        const create = api.givenCreateSucceeds(makePortfolioItem(draft));

        const res = await api.createItem(draft);

        expect(res.status).toBe(201);
        expect(portfolioItemDtoSchema.parse(await res.json()).currentValue).toBe(0);
        expect(create.calls).toStrictEqual([[draft]]);
    });

    it("answers 404 INSTRUMENT_NOT_FOUND for an unknown instrument", async () => {
        await using api = await PortfolioItemsHarness.launch();
        api.givenCreateFails(new InstrumentNotFoundError(MISSING_ID));

        const res = await api.createItem({
            instrumentId: MISSING_ID,
            broker: "MyInvestor",
            targetWeight: 25,
        });

        expect(res.status).toBe(404);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("INSTRUMENT_NOT_FOUND");
    });

    it("answers 422 with the failing field path when targetWeight is out of range", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const res = await api.createItem({
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
    });

    it("answers 422 when the body is not valid JSON", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const res = await api.createItemFromRaw("{nope");

        expect(res.status).toBe(422);
        const body = apiErrorDtoSchema.parse(await res.json());
        expect(body.code).toBe("VALIDATION_ERROR");
        expect(body.issues).toEqual([{ path: "", message: expect.any(String) }]);
    });
});

describe("PUT /portfolio-items/:id", () => {
    it("updates the item against the version the caller read and answers 200 with its DTO", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem({ targetWeight: 25 });
        const expectedUpdatedAt = item.updatedAt.toISOString();
        const update = api.givenUpdateSucceeds(item);

        const res = await api.updateItem(item.id, { targetWeight: 25, expectedUpdatedAt });

        expect(res.status).toBe(200);
        const body = portfolioItemDtoSchema.parse(await res.json());
        expect(body.id).toBe(item.id);
        expect(body.targetWeight).toBe(25);
        expect(body.broker).toBe("MyInvestor");
        expect(update.calls).toStrictEqual([
            [item.id, { targetWeight: 25 }, new Date(expectedUpdatedAt)],
        ]);
    });

    it("clears notes when the body sets them to null", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem();
        const update = api.givenUpdateSucceeds(item);

        const res = await api.updateItem(item.id, {
            notes: null,
            expectedUpdatedAt: item.updatedAt.toISOString(),
        });

        expect(res.status).toBe(200);
        expect(portfolioItemDtoSchema.parse(await res.json())).not.toHaveProperty("notes");
        expect(update.calls[0]![1]).toStrictEqual({ notes: undefined });
    });

    it("passes every changed field and keeps notes when the body omits them", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem({ notes: "core" });
        const update = api.givenUpdateSucceeds(item);

        const res = await api.updateItem(item.id, {
            broker: "Degiro",
            targetWeight: 25,
            currentValue: 10,
            expectedUpdatedAt: item.updatedAt.toISOString(),
        });

        expect(res.status).toBe(200);
        expect(portfolioItemDtoSchema.parse(await res.json()).notes).toBe("core");
        expect(update.calls[0]![1]).toStrictEqual({
            broker: "Degiro",
            targetWeight: 25,
            currentValue: 10,
        });
    });

    it("answers 404 PORTFOLIO_ITEM_NOT_FOUND for an unknown item", async () => {
        await using api = await PortfolioItemsHarness.launch();
        api.givenUpdateFails(new PortfolioItemNotFoundError(MISSING_ID));

        const res = await api.updateItem(MISSING_ID, {
            targetWeight: 25,
            expectedUpdatedAt: new Date().toISOString(),
        });

        expect(res.status).toBe(404);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
    });

    it("answers 422 for an id that is not a UUID", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const res = await api.updateItem("not-a-uuid", {
            targetWeight: 25,
            expectedUpdatedAt: new Date().toISOString(),
        });

        expect(res.status).toBe(422);
        const body = apiErrorDtoSchema.parse(await res.json());
        expect(body.code).toBe("VALIDATION_ERROR");
        expect(body.issues?.[0]?.path).toBe("id");
    });

    it("answers 422 for an invalid body without reaching the use case", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem();
        const update = api.givenUpdateSucceeds(item);

        const res = await api.updateItem(item.id, {
            broker: "",
            expectedUpdatedAt: item.updatedAt.toISOString(),
        });

        expect(res.status).toBe(422);
        expect(update.calls).toEqual([]);
    });

    it("answers 409 PORTFOLIO_ITEM_CONFLICT for a stale version", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem();
        api.givenUpdateFails(new PortfolioItemConflictError(item.id));
        const stale = new Date(item.updatedAt.getTime() - 1).toISOString();

        const res = await api.updateItem(item.id, { targetWeight: 25, expectedUpdatedAt: stale });

        expect(res.status).toBe(409);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("PORTFOLIO_ITEM_CONFLICT");
    });

    it("answers 422 when the body omits expectedUpdatedAt", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const res = await api.updateItem(MISSING_ID, { targetWeight: 25 });

        expect(res.status).toBe(422);
        const body = apiErrorDtoSchema.parse(await res.json());
        expect(body.code).toBe("VALIDATION_ERROR");
        expect(body.issues?.[0]?.path).toBe("expectedUpdatedAt");
    });
});

describe("DELETE /portfolio-items/:id", () => {
    it("deletes the item and answers 204 without a body", async () => {
        await using api = await PortfolioItemsHarness.launch();
        const item = makePortfolioItem();
        const remove = api.givenDeleteSucceeds();

        const res = await api.deleteItem(item.id);

        expect(res.status).toBe(204);
        expect(await res.text()).toBe("");
        expect(remove.calls).toEqual([[item.id]]);
    });

    it("answers 404 PORTFOLIO_ITEM_NOT_FOUND for an unknown item", async () => {
        await using api = await PortfolioItemsHarness.launch();
        api.givenDeleteFails(new PortfolioItemNotFoundError(MISSING_ID));

        const res = await api.deleteItem(MISSING_ID);

        expect(res.status).toBe(404);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
    });

    it("answers 422 for an id that is not a UUID", async () => {
        await using api = await PortfolioItemsHarness.launch();

        const res = await api.deleteItem("nope");

        expect(res.status).toBe(422);
    });
});
