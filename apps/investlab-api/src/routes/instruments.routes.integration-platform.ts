import { describe, expect, it } from "vitest";
import {
    InstrumentAlreadyExistsError,
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

        const { status, body } = await api.listInstruments();

        expect(status).toBe(200);
        expect(body).toEqual([
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

        const { status, body } = await api.listInstruments();

        expect(status).toBe(200);
        expect(body).toEqual([]);
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

        const { status, body } = await api.createInstrument(draft);

        expect(status).toBe(201);
        expect(body).toMatchObject({
            symbol: "VWCE",
            replicates: "FTSE All-World",
            quotable: true,
        });
        expect(create.calls).toEqual([[draft]]);
    });

    it("answers 409 INSTRUMENT_ALREADY_EXISTS for a symbol in the catalog", async () => {
        await using api = await InstrumentsHarness.launch();
        api.givenCreateFails(new InstrumentAlreadyExistsError("AAPL"));

        const { status, body } = await api.createInstrument({
            symbol: "AAPL",
            name: "Apple Inc.",
            type: "stock",
            assetClass: "equity",
        });

        expect(status).toBe(409);
        expect(body).toMatchObject({ code: "INSTRUMENT_ALREADY_EXISTS" });
    });

    it("answers 422 with the failing field path for an unknown type", async () => {
        await using api = await InstrumentsHarness.launch();

        const { status, body } = await api.createInstrument({
            symbol: "VWCE",
            name: "Vanguard FTSE All-World",
            type: "warrant",
            assetClass: "equity",
        });

        expect(status).toBe(422);
        expect(body).toMatchObject({ code: "VALIDATION_ERROR", issues: [{ path: "type" }] });
    });
});

describe("PUT /instruments/:id", () => {
    it("passes the changed fields, keeps the others and answers 200 with the DTO", async () => {
        await using api = await InstrumentsHarness.launch();
        const instrument = makeInstrument({ symbol: "VTI" });
        const update = api.givenUpdateSucceeds(instrument);

        const { status, body } = await api.updateInstrument(instrument.id, {
            name: "Vanguard Total Market",
        });

        expect(status).toBe(200);
        expect(body).toEqual({
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

        const { status } = await api.updateInstrument(instrument.id, {
            exchange: "NYSE",
            sector: "technology",
            replicates: "S&P 500",
            quotable: false,
        });

        expect(status).toBe(200);
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

        const { status, body } = await api.updateInstrument(instrument.id, {
            exchange: null,
            sector: null,
            replicates: null,
        });

        expect(status).toBe(200);
        expect(body).not.toHaveProperty("replicates");
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

        const { status, body } = await api.updateInstrument(MISSING_ID, { symbol: "VWCE" });

        expect(status).toBe(409);
        expect(body).toMatchObject({ code: "INSTRUMENT_ALREADY_EXISTS" });
    });

    it("answers 404 INSTRUMENT_NOT_FOUND for an unknown instrument", async () => {
        await using api = await InstrumentsHarness.launch();
        api.givenUpdateFails(new InstrumentNotFoundError(MISSING_ID));

        const { status, body } = await api.updateInstrument(MISSING_ID, { name: "Nothing" });

        expect(status).toBe(404);
        expect(body).toMatchObject({ code: "INSTRUMENT_NOT_FOUND" });
    });

    it("answers 422 for an id that is not a UUID", async () => {
        await using api = await InstrumentsHarness.launch();

        const { status, body } = await api.updateInstrument("not-a-uuid", { name: "Nothing" });

        expect(status).toBe(422);
        expect(body).toMatchObject({ issues: [{ path: "id" }] });
    });
});

describe("DELETE /instruments/:id", () => {
    it("removes an unused instrument and answers 204 without a body", async () => {
        await using api = await InstrumentsHarness.launch();
        const instrument = makeInstrument();
        const remove = api.givenDeleteSucceeds();

        const { status, body } = await api.deleteInstrument(instrument.id);

        expect(status).toBe(204);
        expect(body).toBeUndefined();
        expect(remove.calls).toEqual([[instrument.id]]);
    });

    it("answers 409 INSTRUMENT_IN_USE while a portfolio item references it", async () => {
        await using api = await InstrumentsHarness.launch();
        api.givenDeleteFails(new InstrumentInUseError(MISSING_ID));

        const { status, body } = await api.deleteInstrument(MISSING_ID);

        expect(status).toBe(409);
        expect(body).toMatchObject({ code: "INSTRUMENT_IN_USE" });
    });
});
