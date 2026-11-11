import { describe, expect, it } from "vitest";
import {
    InvalidCodeError,
    PersistenceError,
    SessionAlreadyClosedError,
    SessionClosedError,
    SessionNotFoundError,
    SessionStatus,
    ValidationError,
} from "@m0n0lab/qup-domain";
import { makeOrder, makeOrderItem, makeSession } from "../harness/builders.ts";
import { SessionRouteHarness } from "./session.routes.harness.ts";

const MISSING_ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

describe("sessionRoutes", () => {
    describe("admin session routes", () => {
        it("reject a request without the admin PIN before reaching a use case", async () => {
            await using api = await SessionRouteHarness.launch();

            const responses = await Promise.all([
                api.anonymous("/sessions", { method: "POST" }),
                api.anonymous("/sessions?status=OPEN"),
                api.anonymous(`/sessions/${MISSING_ID}`),
                api.anonymous(`/sessions/${MISSING_ID}/orders`),
                api.anonymous(`/sessions/${MISSING_ID}/close`, { method: "PATCH" }),
            ]);

            expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
        });
    });

    describe("POST /sessions", () => {
        it("creates a session from the name and answers 201 with its DTO", async () => {
            await using api = await SessionRouteHarness.launch();
            const session = makeSession({ name: "Friday brunch" });
            const create = api.givenSessionCreated(session);

            const { status, body } = await api.createSession({ name: "Friday brunch" });

            expect(status).toBe(201);
            expect(body).toEqual({
                id: session.id,
                name: "Friday brunch",
                code: "ABC123",
                status: "OPEN",
                createdAt: "2026-11-06T09:00:00.000Z",
                closedAt: null,
            });
            expect(create.calls).toEqual([[{ name: "Friday brunch" }]]);
        });

        it("answers 422 VALIDATION_ERROR for a name the domain rejects", async () => {
            await using api = await SessionRouteHarness.launch();
            api.givenCreateFails(new ValidationError("Session name is required"));

            const { status, body } = await api.createSession({ name: " " });

            expect(status).toBe(422);
            expect(body).toEqual({
                code: "VALIDATION_ERROR",
                message: "Session name is required",
                statusCode: 422,
            });
        });
    });

    describe("GET /sessions", () => {
        it("lists the open sessions for status=OPEN", async () => {
            await using api = await SessionRouteHarness.launch();
            const session = makeSession();
            api.givenActiveSessions([session]);

            const { status, body } = await api.listSessions("?status=OPEN");

            expect(status).toBe(200);
            expect(body).toMatchObject([{ id: session.id, code: "ABC123" }]);
        });

        it("answers 422 without the status query param", async () => {
            await using api = await SessionRouteHarness.launch();

            const { status, body } = await api.listSessions("");

            expect(status).toBe(422);
            expect(body).toEqual({
                code: "VALIDATION_ERROR",
                message: "status query param required",
                statusCode: 422,
            });
        });

        it("answers a hidden 500 PERSISTENCE_ERROR when the store fails", async () => {
            await using api = await SessionRouteHarness.launch();
            api.givenActiveSessionsFail(new PersistenceError(new Error("db down")));

            const { status, body } = await api.listSessions("?status=OPEN");

            expect(status).toBe(500);
            expect(body).toEqual({
                code: "PERSISTENCE_ERROR",
                message: "Internal server error",
                statusCode: 500,
            });
        });
    });

    describe("GET /sessions/code/:code", () => {
        it("finds the session by the code in the path", async () => {
            await using api = await SessionRouteHarness.launch();
            const session = makeSession();
            const find = api.givenSessionByCode(session);

            const { status, body } = await api.sessionByCode("abc123");

            expect(status).toBe(200);
            expect(body).toMatchObject({ id: session.id, code: "ABC123" });
            expect(find.calls).toEqual([["abc123"]]);
        });

        it("answers 422 INVALID_CODE for a malformed code", async () => {
            await using api = await SessionRouteHarness.launch();
            api.givenSessionByCodeFails(new InvalidCodeError("nope"));

            const { status, body } = await api.sessionByCode("nope");

            expect(status).toBe(422);
            expect(body).toMatchObject({ code: "INVALID_CODE" });
        });
    });

    describe("GET /sessions/code/:code/orders", () => {
        it("answers only the orders of the exact guest named, in the public projection", async () => {
            await using api = await SessionRouteHarness.launch();
            const session = makeSession();
            const find = api.givenSessionByCode(session);
            const order = makeOrder({
                sessionId: session.id,
                guestName: "Ana",
                notes: "oat milk",
                items: [makeOrderItem({ customization: "extra hot" })],
            });
            const list = api.givenSessionOrders([
                order,
                makeOrder({ sessionId: session.id, guestName: "Bruno" }),
                makeOrder({ sessionId: session.id, guestName: "ana" }),
            ]);

            const { status, body } = await api.guestOrders("abc123", "?guest=Ana");

            expect(status).toBe(200);
            expect(body).toEqual([
                {
                    id: order.id,
                    guestName: "Ana",
                    status: "PENDING",
                    items: [{ name: "Flat white", quantity: 2 }],
                    hiddenItemCount: 0,
                },
            ]);
            expect(find.calls).toEqual([["abc123"]]);
            expect(list.calls).toEqual([[session.id]]);
        });

        it("lists the first three product lines by product name and counts the rest", async () => {
            await using api = await SessionRouteHarness.launch();
            const session = makeSession();
            api.givenSessionByCode(session);
            const items = ["Toast", "Croissant", "Orange juice", "Americano", "Flat white"].map(
                (name, index) => makeOrderItem({ menuItemName: name, quantity: index + 1 }),
            );
            api.givenSessionOrders([makeOrder({ sessionId: session.id, items })]);

            const { body } = await api.guestOrders("ABC123", "?guest=Ana");

            expect(body).toMatchObject([
                {
                    items: [
                        { name: "Americano", quantity: 4 },
                        { name: "Croissant", quantity: 2 },
                        { name: "Flat white", quantity: 5 },
                    ],
                    hiddenItemCount: 2,
                },
            ]);
        });

        it("answers 422 without the guest query param, before looking the session up", async () => {
            await using api = await SessionRouteHarness.launch();
            const find = api.givenSessionByCode(makeSession());

            const { status, body } = await api.guestOrders("ABC123", "");

            expect(status).toBe(422);
            expect(body).toEqual({
                code: "VALIDATION_ERROR",
                message: "guest query param required",
                statusCode: 422,
            });
            expect(find.calls).toEqual([]);
        });

        it.each([
            { error: new InvalidCodeError("nope"), status: 422, code: "INVALID_CODE" },
            { error: new SessionNotFoundError("ZZZ999"), status: 404, code: "SESSION_NOT_FOUND" },
            { error: new SessionClosedError(MISSING_ID), status: 409, code: "SESSION_CLOSED" },
        ])("answers $status $code for that session code without listing orders", async (row) => {
            await using api = await SessionRouteHarness.launch();
            api.givenSessionByCodeFails(row.error);
            const list = api.givenSessionOrders([]);

            const { status, body } = await api.guestOrders("ABC123", "?guest=Ana");

            expect(status).toBe(row.status);
            expect(body).toMatchObject({ code: row.code });
            expect(list.calls).toEqual([]);
        });

        it("answers a hidden 500 when the store fails", async () => {
            await using api = await SessionRouteHarness.launch();
            api.givenSessionByCode(makeSession());
            api.givenSessionOrdersFail(new PersistenceError(new Error("db down")));

            const { status, body } = await api.guestOrders("ABC123", "?guest=Ana");

            expect(status).toBe(500);
            expect(body).toEqual({
                code: "PERSISTENCE_ERROR",
                message: "Internal server error",
                statusCode: 500,
            });
        });
    });

    describe("GET /sessions/:id", () => {
        it("answers the session with its closing time once closed", async () => {
            await using api = await SessionRouteHarness.launch();
            const session = makeSession({
                status: SessionStatus.CLOSED,
                closedAt: new Date("2026-11-06T13:00:00.000Z"),
            });
            const find = api.givenSessionById(session);

            const { status, body } = await api.sessionById(session.id);

            expect(status).toBe(200);
            expect(body).toMatchObject({
                status: "CLOSED",
                closedAt: "2026-11-06T13:00:00.000Z",
            });
            expect(find.calls).toEqual([[session.id]]);
        });

        it("answers 404 SESSION_NOT_FOUND for an unknown id", async () => {
            await using api = await SessionRouteHarness.launch();
            api.givenSessionByIdFails(new SessionNotFoundError(MISSING_ID));

            const { status, body } = await api.sessionById(MISSING_ID);

            expect(status).toBe(404);
            expect(body).toEqual({
                code: "SESSION_NOT_FOUND",
                message: `Session not found: ${MISSING_ID}`,
                statusCode: 404,
            });
        });
    });

    describe("GET /sessions/:id/orders", () => {
        it("lists the session's orders as DTOs", async () => {
            await using api = await SessionRouteHarness.launch();
            const order = makeOrder({ sessionId: MISSING_ID, notes: "oat milk" });
            const list = api.givenSessionOrders([order]);

            const { status, body } = await api.sessionOrders(MISSING_ID);

            expect(status).toBe(200);
            expect(body).toEqual([
                {
                    id: order.id,
                    sessionId: MISSING_ID,
                    guestName: "Ana",
                    items: [
                        {
                            id: `${order.id}:6b3389b3-bff8-416e-93ad-e6d411808d95:0`,
                            menuItemId: "6b3389b3-bff8-416e-93ad-e6d411808d95",
                            menuItemName: "Flat white",
                            quantity: 2,
                            customization: null,
                        },
                    ],
                    status: "PENDING",
                    notes: "oat milk",
                    createdAt: "2026-11-06T09:05:00.000Z",
                    updatedAt: "2026-11-06T09:05:00.000Z",
                },
            ]);
            expect(list.calls).toEqual([[MISSING_ID]]);
        });

        it("answers a hidden 500 when the store fails", async () => {
            await using api = await SessionRouteHarness.launch();
            api.givenSessionOrdersFail(new PersistenceError(new Error("db down")));

            const { status } = await api.sessionOrders(MISSING_ID);

            expect(status).toBe(500);
        });
    });

    describe("PATCH /sessions/:id/close", () => {
        it("closes the session in the path", async () => {
            await using api = await SessionRouteHarness.launch();
            const close = api.givenCloseSucceeds();

            const { status, body } = await api.closeSession(MISSING_ID);

            expect(status).toBe(200);
            expect(body).toEqual({ ok: true });
            expect(close.calls).toEqual([[MISSING_ID]]);
        });

        it("answers 409 SESSION_ALREADY_CLOSED for a closed session", async () => {
            await using api = await SessionRouteHarness.launch();
            api.givenCloseFails(new SessionAlreadyClosedError(MISSING_ID));

            const { status, body } = await api.closeSession(MISSING_ID);

            expect(status).toBe(409);
            expect(body).toMatchObject({ code: "SESSION_ALREADY_CLOSED" });
        });
    });
});
