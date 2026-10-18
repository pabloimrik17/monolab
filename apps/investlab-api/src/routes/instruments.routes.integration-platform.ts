import { describe, expect, it, vi } from "vitest";
import { apiErrorDtoSchema, PersistenceError } from "@m0n0lab/investlab-core";
import {
    InstrumentAlreadyExistsError,
    instrumentDtoSchema,
    InstrumentInUseError,
    InstrumentNotFoundError,
    Sector,
} from "@m0n0lab/investlab-portfolio";
import { makeInstrument } from "@m0n0lab/investlab-portfolio/testing";
import { InstrumentsHarness } from "./instruments.harness.ts";

const MISSING_ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

describe("instrument routes", () => {
    it("reject every route without a token", async () => {
        await using api = await InstrumentsHarness.launch();

        const responses = await Promise.all([
            api.anonymous("/instruments"),
            api.anonymous("/instruments", { method: "POST" }),
            api.anonymous(`/instruments/${MISSING_ID}`, { method: "PUT" }),
            api.anonymous(`/instruments/${MISSING_ID}`, { method: "DELETE" }),
        ]);

        expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401]);
    });
});

describe("GET /instruments", () => {
    it("lists the catalog as DTOs, with the optional fields only when set", async () => {
        await using api = await InstrumentsHarness.launch();
        const bare = makeInstrument({ symbol: "VTI" });
        const full = makeInstrument({
            symbol: "AAPL",
            name: "Apple",
            exchange: "NASDAQ",
            sector: Sector.Technology,
            replicates: "nothing",
            quotable: false,
        });
        const list = api.givenInstruments([bare, full]);

        const res = await api.listInstruments();

        expect(res.status).toBe(200);
        expect(instrumentDtoSchema.array().parse(await res.json())).toEqual([
            {
                id: bare.id,
                symbol: "VTI",
                name: "VTI fund",
                type: "etf",
                assetClass: "equity",
                quotable: true,
            },
            {
                id: full.id,
                symbol: "AAPL",
                name: "Apple",
                type: "etf",
                assetClass: "equity",
                exchange: "NASDAQ",
                sector: "technology",
                replicates: "nothing",
                quotable: false,
            },
        ]);
        expect(list.calls).toEqual([[]]);
    });

    it("answers an empty catalog", async () => {
        await using api = await InstrumentsHarness.launch();
        api.givenInstruments([]);

        const res = await api.listInstruments();

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual([]);
    });

    it("hides persistence failures behind a generic 500", async () => {
        await using api = await InstrumentsHarness.launch();
        vi.spyOn(console, "error").mockImplementation(() => {});
        api.givenListFails(new PersistenceError(new Error("db down")));

        const res = await api.listInstruments();

        expect(res.status).toBe(500);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("PERSISTENCE_ERROR");
    });
});

describe("POST /instruments", () => {
    it("creates the instrument from the body and answers 201 with its DTO", async () => {
        await using api = await InstrumentsHarness.launch();
        const draft = {
            symbol: "vwce",
            name: "Vanguard FTSE All-World",
            type: "etf",
            assetClass: "equity",
            replicates: "FTSE All-World",
        };
        const create = api.givenCreateSucceeds(
            makeInstrument({ symbol: "VWCE", name: draft.name, replicates: draft.replicates }),
        );

        const res = await api.createInstrument(draft);

        expect(res.status).toBe(201);
        expect(instrumentDtoSchema.parse(await res.json())).toMatchObject({
            symbol: "VWCE",
            replicates: "FTSE All-World",
            quotable: true,
        });
        expect(create.calls).toEqual([[draft]]);
    });

    it("answers 409 INSTRUMENT_ALREADY_EXISTS for a symbol in the catalog", async () => {
        await using api = await InstrumentsHarness.launch();
        api.givenCreateFails(new InstrumentAlreadyExistsError("AAPL"));

        const res = await api.createInstrument({
            symbol: "AAPL",
            name: "Apple Inc.",
            type: "stock",
            assetClass: "equity",
        });

        expect(res.status).toBe(409);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("INSTRUMENT_ALREADY_EXISTS");
    });

    it("answers 422 with the failing field path for an unknown type", async () => {
        await using api = await InstrumentsHarness.launch();

        const res = await api.createInstrument({
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
    it("passes the changed fields, keeps the others and answers 200 with the DTO", async () => {
        await using api = await InstrumentsHarness.launch();
        const instrument = makeInstrument({ symbol: "VTI" });
        const update = api.givenUpdateSucceeds(instrument);

        const res = await api.updateInstrument(instrument.id, { name: "Vanguard Total Market" });

        expect(res.status).toBe(200);
        expect(instrumentDtoSchema.parse(await res.json())).toEqual({
            id: instrument.id,
            symbol: "VTI",
            name: "VTI fund",
            type: "etf",
            assetClass: "equity",
            quotable: true,
        });
        expect(update.calls).toStrictEqual([
            [
                instrument.id,
                {
                    symbol: undefined,
                    name: "Vanguard Total Market",
                    type: undefined,
                    assetClass: undefined,
                    quotable: undefined,
                },
            ],
        ]);
    });

    it("sets exchange, sector and the tracked index when the body carries them", async () => {
        await using api = await InstrumentsHarness.launch();
        const instrument = makeInstrument();
        const update = api.givenUpdateSucceeds(instrument);

        const res = await api.updateInstrument(instrument.id, {
            exchange: "NYSE",
            sector: "technology",
            replicates: "S&P 500",
            quotable: false,
        });

        expect(res.status).toBe(200);
        expect(update.calls[0]![1]).toMatchObject({
            exchange: "NYSE",
            sector: "technology",
            replicates: "S&P 500",
            quotable: false,
        });
    });

    it("clears exchange, sector and the tracked index when the body sets them to null", async () => {
        await using api = await InstrumentsHarness.launch();
        const instrument = makeInstrument({ replicates: "CRSP US Total Market" });
        const update = api.givenUpdateSucceeds(makeInstrument({ symbol: instrument.symbol }));

        const res = await api.updateInstrument(instrument.id, {
            exchange: null,
            sector: null,
            replicates: null,
        });

        expect(res.status).toBe(200);
        expect(instrumentDtoSchema.parse(await res.json())).not.toHaveProperty("replicates");
        expect(update.calls[0]![1]).toMatchObject({
            exchange: undefined,
            sector: undefined,
            replicates: undefined,
        });
        expect(Object.keys(update.calls[0]![1])).toEqual(
            expect.arrayContaining(["exchange", "sector", "replicates"]),
        );
    });

    it("answers 409 INSTRUMENT_ALREADY_EXISTS for a taken symbol", async () => {
        await using api = await InstrumentsHarness.launch();
        api.givenUpdateFails(new InstrumentAlreadyExistsError("VWCE"));

        const res = await api.updateInstrument(MISSING_ID, { symbol: "VWCE" });

        expect(res.status).toBe(409);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("INSTRUMENT_ALREADY_EXISTS");
    });

    it("answers 404 INSTRUMENT_NOT_FOUND for an unknown instrument", async () => {
        await using api = await InstrumentsHarness.launch();
        api.givenUpdateFails(new InstrumentNotFoundError(MISSING_ID));

        const res = await api.updateInstrument(MISSING_ID, { name: "Nothing" });

        expect(res.status).toBe(404);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("INSTRUMENT_NOT_FOUND");
    });

    it("answers 422 for an id that is not a UUID", async () => {
        await using api = await InstrumentsHarness.launch();

        const res = await api.updateInstrument("not-a-uuid", { name: "Nothing" });

        expect(res.status).toBe(422);
        expect(apiErrorDtoSchema.parse(await res.json()).issues?.[0]?.path).toBe("id");
    });
});

describe("DELETE /instruments/:id", () => {
    it("removes an unused instrument and answers 204 without a body", async () => {
        await using api = await InstrumentsHarness.launch();
        const instrument = makeInstrument();
        const remove = api.givenDeleteSucceeds();

        const res = await api.deleteInstrument(instrument.id);

        expect(res.status).toBe(204);
        expect(await res.text()).toBe("");
        expect(remove.calls).toEqual([[instrument.id]]);
    });

    it("answers 409 INSTRUMENT_IN_USE while a portfolio item references it", async () => {
        await using api = await InstrumentsHarness.launch();
        api.givenDeleteFails(new InstrumentInUseError(MISSING_ID));

        const res = await api.deleteInstrument(MISSING_ID);

        expect(res.status).toBe(409);
        expect(apiErrorDtoSchema.parse(await res.json()).code).toBe("INSTRUMENT_IN_USE");
    });
});
