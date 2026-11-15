import { describe, expect, it } from "vitest";
import { Sector } from "@m0n0lab/investlab-catalog";
import {
    EntryConflictError,
    EntryNotFoundError,
    FieldNotInStateError,
    InvalidTransitionError,
    MissingRequiredFieldError,
    RogerState,
} from "@m0n0lab/investlab-roger";
import { makeEntry } from "@m0n0lab/investlab-roger/testing";
import { EntryRouteHarness } from "./entry.route.harness.ts";

const MISSING_ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

describe("entryRoutes", () => {
    it("rejects every route without a token", async () => {
        await using api = await EntryRouteHarness.launch();
        const id = `/roger/entries/${MISSING_ID}`;

        const responses = await Promise.all([
            api.anonymous("/roger/entries"),
            api.anonymous("/roger/entries", { method: "POST" }),
            api.anonymous(id, { method: "PUT" }),
            api.anonymous(id, { method: "DELETE" }),
            api.anonymous(`${id}/transitions`, { method: "POST" }),
            api.anonymous(`${id}/re-entries`, { method: "POST" }),
        ]);

        expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401, 401]);
    });

    describe("GET /roger/entries", () => {
        it("lists the active entries by default, each with its instrument", async () => {
            await using api = await EntryRouteHarness.launch();
            const entry = makeEntry({ state: RogerState.Invested });
            const list = api.givenEntries([
                { entry, instrument: { symbol: "ASTS", name: "AST SpaceMobile" } },
            ]);

            const { status, body } = await api.listEntries();

            expect(status).toBe(200);
            expect(body).toMatchObject([
                {
                    entry: { id: entry.id, state: "INVESTED", quantity: 10, buyDate: "2026-10-01" },
                    instrument: { symbol: "ASTS", name: "AST SpaceMobile" },
                },
            ]);
            expect(list.calls).toEqual([["active"]]);
        });

        it("lists the history for view=history and carries the sector", async () => {
            await using api = await EntryRouteHarness.launch();
            const entry = makeEntry({ state: RogerState.Sold });
            const list = api.givenEntries([
                { entry, instrument: { symbol: "SPY", name: "SPDR", sector: Sector.Technology } },
            ]);

            const { status, body } = await api.listEntries("?view=history");

            expect(status).toBe(200);
            expect(body).toMatchObject([
                {
                    entry: { state: "SOLD", exitPrice: 180 },
                    instrument: { sector: Sector.Technology },
                },
            ]);
            expect(list.calls).toEqual([["history"]]);
        });

        it("answers 422 VALIDATION_ERROR for an unknown view", async () => {
            await using api = await EntryRouteHarness.launch();
            const list = api.givenEntries([]);

            const { status, body } = await api.listEntries("?view=all");

            expect(status).toBe(422);
            expect(body).toMatchObject({ code: "VALIDATION_ERROR", issues: [{ path: "view" }] });
            expect(list.calls).toEqual([]);
        });
    });

    describe("POST /roger/entries", () => {
        it("creates with a new stock and answers 201", async () => {
            await using api = await EntryRouteHarness.launch();
            const entry = makeEntry({ entryPrice: 30 });
            const create = api.givenCreateSucceeds(entry);

            const { status, body } = await api.createEntry({
                state: "WATCHING",
                entryPrice: 30,
                newInstrument: { symbol: "ASTS", name: "AST SpaceMobile" },
            });

            expect(status).toBe(201);
            expect(body).toMatchObject({ id: entry.id, state: "WATCHING", entryPrice: 30 });
            expect(create.calls[0]![0]).toMatchObject({
                state: "WATCHING",
                entryPrice: 30,
                newInstrument: { symbol: "ASTS", name: "AST SpaceMobile" },
            });
            expect(create.calls[0]![0]).not.toHaveProperty("instrumentId");
        });

        it("creates against an existing instrument", async () => {
            await using api = await EntryRouteHarness.launch();
            const entry = makeEntry();
            const create = api.givenCreateSucceeds(entry);

            const { status } = await api.createEntry({
                state: "WATCHING",
                entryPrice: 30,
                instrumentId: entry.instrumentId,
            });

            expect(status).toBe(201);
            expect(create.calls[0]![0]).toMatchObject({ instrumentId: entry.instrumentId });
        });

        it("answers 422 when the body names both or neither instrument", async () => {
            await using api = await EntryRouteHarness.launch();
            const create = api.givenCreateSucceeds(makeEntry());

            const { status, body } = await api.createEntry({ state: "WATCHING", entryPrice: 30 });

            expect(status).toBe(422);
            expect(body).toMatchObject({
                code: "VALIDATION_ERROR",
                issues: [{ path: "instrumentId" }],
            });
            expect(create.calls).toEqual([]);
        });
    });

    describe("PUT /roger/entries/:id", () => {
        it("edits the values against the version the caller read", async () => {
            await using api = await EntryRouteHarness.launch();
            const entry = makeEntry({ entryPrice: 31 });
            const expectedUpdatedAt = entry.updatedAt.toISOString();
            const edit = api.givenEditSucceeds(entry);

            const { status, body } = await api.editEntry(entry.id, {
                entryPrice: 31,
                expectedUpdatedAt,
            });

            expect(status).toBe(200);
            expect(body).toMatchObject({ id: entry.id, entryPrice: 31 });
            expect(edit.calls[0]![0]).toBe(entry.id);
            expect(edit.calls[0]![1]).toMatchObject({ entryPrice: 31 });
            expect(edit.calls[0]![2]).toEqual(new Date(expectedUpdatedAt));
        });

        it("answers 409 ENTRY_CONFLICT for a stale version", async () => {
            await using api = await EntryRouteHarness.launch();
            api.givenEditFails(new EntryConflictError(MISSING_ID));

            const { status, body } = await api.editEntry(MISSING_ID, {
                entryPrice: 31,
                expectedUpdatedAt: new Date().toISOString(),
            });

            expect(status).toBe(409);
            expect(body).toMatchObject({ code: "ENTRY_CONFLICT" });
        });

        it("answers 422 FIELD_NOT_IN_STATE naming the field", async () => {
            await using api = await EntryRouteHarness.launch();
            api.givenEditFails(new FieldNotInStateError("quantity", RogerState.Watching));

            const { status, body } = await api.editEntry(MISSING_ID, {
                quantity: 5,
                expectedUpdatedAt: new Date().toISOString(),
            });

            expect(status).toBe(422);
            expect(body).toMatchObject({
                code: "FIELD_NOT_IN_STATE",
                issues: [{ path: "quantity" }],
            });
        });

        it("answers 422 for an id that is not a UUID or a body without expectedUpdatedAt", async () => {
            await using api = await EntryRouteHarness.launch();

            const badId = await api.editEntry("nope", {
                entryPrice: 31,
                expectedUpdatedAt: new Date().toISOString(),
            });
            const noVersion = await api.editEntry(MISSING_ID, { entryPrice: 31 });

            expect(badId.status).toBe(422);
            expect(noVersion.body).toMatchObject({ issues: [{ path: "expectedUpdatedAt" }] });
        });
    });

    describe("DELETE /roger/entries/:id", () => {
        it("deletes the entry and answers 204 without a body", async () => {
            await using api = await EntryRouteHarness.launch();
            const remove = api.givenDeleteSucceeds();

            const { status, body } = await api.deleteEntry(MISSING_ID);

            expect(status).toBe(204);
            expect(body).toBeUndefined();
            expect(remove.calls).toEqual([[MISSING_ID]]);
        });

        it("answers 404 ENTRY_NOT_FOUND for an unknown entry", async () => {
            await using api = await EntryRouteHarness.launch();
            api.givenDeleteFails(new EntryNotFoundError(MISSING_ID));

            const { status, body } = await api.deleteEntry(MISSING_ID);

            expect(status).toBe(404);
            expect(body).toMatchObject({ code: "ENTRY_NOT_FOUND" });
        });
    });

    describe("POST /roger/entries/:id/transitions", () => {
        it("moves the entry and answers 200 with it", async () => {
            await using api = await EntryRouteHarness.launch();
            const entry = makeEntry({ state: RogerState.BuyOrder, quantity: 10 });
            const expectedUpdatedAt = entry.updatedAt.toISOString();
            const move = api.givenTransitionSucceeds(entry);

            const { status, body } = await api.transition(entry.id, {
                to: "BUY_ORDER",
                quantity: 10,
                expectedUpdatedAt,
            });

            expect(status).toBe(200);
            expect(body).toMatchObject({ state: "BUY_ORDER", quantity: 10 });
            expect(move.calls[0]![0]).toBe(entry.id);
            expect(move.calls[0]![1]).toBe("BUY_ORDER");
            expect(move.calls[0]![2]).toMatchObject({ quantity: 10 });
            expect(move.calls[0]![3]).toEqual(new Date(expectedUpdatedAt));
        });

        it("answers 409 INVALID_TRANSITION for a move outside the table", async () => {
            await using api = await EntryRouteHarness.launch();
            api.givenTransitionFails(
                new InvalidTransitionError(RogerState.Invested, RogerState.BuyOrder),
            );

            const { status, body } = await api.transition(MISSING_ID, {
                to: "BUY_ORDER",
                expectedUpdatedAt: new Date().toISOString(),
            });

            expect(status).toBe(409);
            expect(body).toMatchObject({ code: "INVALID_TRANSITION" });
        });

        it("answers 422 MISSING_REQUIRED_FIELD naming the field", async () => {
            await using api = await EntryRouteHarness.launch();
            api.givenTransitionFails(new MissingRequiredFieldError("quantity"));

            const { status, body } = await api.transition(MISSING_ID, {
                to: "BUY_ORDER",
                expectedUpdatedAt: new Date().toISOString(),
            });

            expect(status).toBe(422);
            expect(body).toMatchObject({
                code: "MISSING_REQUIRED_FIELD",
                statusCode: 422,
                issues: [{ path: "quantity", message: expect.any(String) }],
            });
        });
    });

    describe("POST /roger/entries/:id/re-entries", () => {
        it("answers 201 with the new entry", async () => {
            await using api = await EntryRouteHarness.launch();
            const entry = makeEntry({ state: RogerState.BuyOrder });
            const reEnter = api.givenReEnterSucceeds(entry);

            const { status, body } = await api.reEnter(MISSING_ID, { entryPrice: 150 });

            expect(status).toBe(201);
            expect(body).toMatchObject({ id: entry.id, state: "BUY_ORDER" });
            expect(reEnter.calls[0]![0]).toBe(MISSING_ID);
            expect(reEnter.calls[0]![1]).toMatchObject({ entryPrice: 150 });
        });

        it("answers 409 INVALID_TRANSITION for an entry that is not SOLD", async () => {
            await using api = await EntryRouteHarness.launch();
            api.givenReEnterFails(new InvalidTransitionError(RogerState.Invested));

            const { status, body } = await api.reEnter(MISSING_ID, {});

            expect(status).toBe(409);
            expect(body).toMatchObject({ code: "INVALID_TRANSITION" });
        });
    });
});
