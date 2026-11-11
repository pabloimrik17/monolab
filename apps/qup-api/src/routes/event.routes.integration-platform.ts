import { describe, expect, it, onTestFinished, vi } from "vitest";
import { InvalidCodeError, SessionClosedError, SessionNotFoundError } from "@m0n0lab/qup-domain";
import { makeSession } from "../harness/builders.ts";
import { EventRouteHarness } from "./event.routes.harness.ts";

const OTHER_SESSION_ID = "0d4b8f0e-6a63-4b8c-9a3e-0a1b2c3d4e5f";

describe("eventRoutes", () => {
    describe("GET /events/sessions/:code", () => {
        it("relays order:created as the bare session signal its use case publishes", async () => {
            await using api = await EventRouteHarness.launch();
            const session = makeSession();
            const find = api.givenSession(session);
            await using events = await api.watchSession("abc123");

            api.publish("order:created", { sessionId: session.id });

            expect(await events.next()).toEqual({
                event: "order:created",
                data: { sessionId: session.id },
            });
            expect(find.calls).toEqual([["abc123"]]);
        });

        it("relays order:status, order:cancelled and session:closed as published", async () => {
            await using api = await EventRouteHarness.launch();
            const session = makeSession();
            api.givenSession(session);
            await using events = await api.watchSession("ABC123");
            const sessionId = session.id;
            const updatedAt = new Date("2026-11-06T09:10:00.000Z");

            api.publish("order:status", { orderId: "o1", sessionId, status: "DONE", updatedAt });
            api.publish("order:cancelled", { orderId: "o2", sessionId });
            api.publish("session:closed", { sessionId });

            expect([await events.next(), await events.next(), await events.next()]).toEqual([
                {
                    event: "order:status",
                    data: {
                        orderId: "o1",
                        sessionId,
                        status: "DONE",
                        updatedAt: "2026-11-06T09:10:00.000Z",
                    },
                },
                { event: "order:cancelled", data: { orderId: "o2", sessionId } },
                { event: "session:closed", data: { sessionId } },
            ]);
        });

        it("skips events of other sessions and events it does not relay", async () => {
            await using api = await EventRouteHarness.launch();
            const session = makeSession();
            api.givenSession(session);
            await using events = await api.watchSession("ABC123");

            api.publish("order:cancelled", { orderId: "o1", sessionId: OTHER_SESSION_ID });
            api.publish("session:created", { sessionId: session.id });
            api.publish("session:closed", { sessionId: session.id });

            expect(await events.next()).toEqual({
                event: "session:closed",
                data: { sessionId: session.id },
            });
        });

        it("fans one event out to every watcher of the session", async () => {
            await using api = await EventRouteHarness.launch();
            const session = makeSession();
            api.givenSession(session);
            await using first = await api.watchSession("ABC123");
            await using second = await api.watchSession("ABC123");

            api.publish("session:closed", { sessionId: session.id });

            expect([await first.next(), await second.next()]).toEqual([
                { event: "session:closed", data: { sessionId: session.id } },
                { event: "session:closed", data: { sessionId: session.id } },
            ]);
        });

        it("lets go of its subscriptions and its ping once the client disconnects", async () => {
            vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
            onTestFinished(() => {
                vi.useRealTimers();
            });
            await using api = await EventRouteHarness.launch();
            api.givenSession(makeSession());
            const events = await api.watchSession("ABC123");
            expect(api.subscriptions()).toBe(4);

            events.close();
            await expect.poll(() => api.subscriptions()).toBe(0);
            // A second covers fetch's own sub-second housekeeping timer; a ping waits 30.
            await vi.advanceTimersByTimeAsync(1_000);

            expect(vi.getTimerCount()).toBe(0);
        });

        it("answers 404 SESSION_NOT_FOUND without opening a stream", async () => {
            await using api = await EventRouteHarness.launch();
            api.givenSessionFails(new SessionNotFoundError("ABC123"));

            const { status, body } = await api.watchSessionRefused("ABC123");

            expect(status).toBe(404);
            expect(body).toMatchObject({ code: "SESSION_NOT_FOUND" });
            expect(api.subscriptions()).toBe(0);
        });

        it("answers 422 INVALID_CODE for a malformed code", async () => {
            await using api = await EventRouteHarness.launch();
            api.givenSessionFails(new InvalidCodeError("nope"));

            const { status } = await api.watchSessionRefused("nope");

            expect(status).toBe(422);
        });
    });

    describe("GET /events/sessions/:code/board", () => {
        it("signals each order event as board:changed and the closing as session:closed, all without data", async () => {
            await using api = await EventRouteHarness.launch();
            const session = makeSession();
            const find = api.givenSession(session);
            const sessionId = session.id;
            await using board = await api.watchBoard("abc123");

            api.publish("order:created", { sessionId });
            api.publish("order:status", { orderId: "o1", sessionId, status: "DONE" });
            api.publish("order:cancelled", { orderId: "o2", sessionId });
            api.publish("session:closed", { sessionId });

            expect([
                await board.next(),
                await board.next(),
                await board.next(),
                await board.next(),
            ]).toEqual([
                { event: "board:changed", data: "" },
                { event: "board:changed", data: "" },
                { event: "board:changed", data: "" },
                { event: "session:closed", data: "" },
            ]);
            expect(find.calls).toEqual([["abc123"]]);
        });

        it("skips events of other sessions and events it does not signal", async () => {
            await using api = await EventRouteHarness.launch();
            const session = makeSession();
            api.givenSession(session);
            await using board = await api.watchBoard("ABC123");

            api.publish("order:created", { sessionId: OTHER_SESSION_ID });
            api.publish("session:created", { sessionId: session.id });
            api.publish("session:closed", { sessionId: session.id });

            expect(await board.next()).toEqual({ event: "session:closed", data: "" });
        });

        it("lets go of its subscriptions and its ping once the client disconnects", async () => {
            vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
            onTestFinished(() => {
                vi.useRealTimers();
            });
            await using api = await EventRouteHarness.launch();
            api.givenSession(makeSession());
            const board = await api.watchBoard("ABC123");
            expect(api.subscriptions()).toBe(4);

            board.close();
            await expect.poll(() => api.subscriptions()).toBe(0);
            // A second covers fetch's own sub-second housekeeping timer; a ping waits 30.
            await vi.advanceTimersByTimeAsync(1_000);

            expect(vi.getTimerCount()).toBe(0);
        });

        it("answers 409 SESSION_CLOSED for a closed session without opening a stream", async () => {
            await using api = await EventRouteHarness.launch();
            api.givenSessionFails(new SessionClosedError("ABC123"));

            const { status, body } = await api.watchBoardRefused("ABC123");

            expect(status).toBe(409);
            expect(body).toMatchObject({ code: "SESSION_CLOSED" });
            expect(api.subscriptions()).toBe(0);
        });

        it("answers 404 for an unknown code and 422 for a malformed one without opening a stream", async () => {
            await using api = await EventRouteHarness.launch();
            api.givenSessionFails(new SessionNotFoundError("ABC123"));
            const unknown = await api.watchBoardRefused("ABC123");
            api.givenSessionFails(new InvalidCodeError("nope"));
            const malformed = await api.watchBoardRefused("nope");

            expect([unknown.status, malformed.status]).toEqual([404, 422]);
            expect(api.subscriptions()).toBe(0);
        });
    });
});
