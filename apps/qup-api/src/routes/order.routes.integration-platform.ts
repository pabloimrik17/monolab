import { describe, expect, it } from "vitest";
import {
    InvalidTransitionError,
    MenuItemNotAvailableError,
    OrderNotCancellableError,
    OrderNotFoundError,
    PersistenceError,
    SessionClosedError,
} from "@m0n0lab/qup-domain";
import { makeOrder, makeSession } from "../harness/builders.ts";
import { OrderRouteHarness } from "./order.routes.harness.ts";

const ORDER_ID = "0d4b8f0e-6a63-4b8c-9a3e-0a1b2c3d4e5f";
const MENU_ITEM_ID = "6b3389b3-bff8-416e-93ad-e6d411808d95";

describe("orderRoutes", () => {
    describe("admin order routes", () => {
        it("reject a request without the admin PIN before reaching a use case", async () => {
            await using api = await OrderRouteHarness.launch();

            const responses = await Promise.all([
                api.anonymous(`/orders/${ORDER_ID}/status`, { method: "PATCH" }),
                api.anonymous(`/orders/${ORDER_ID}`, { method: "DELETE" }),
            ]);

            expect(responses.map((r) => r.status)).toEqual([401, 401]);
        });
    });

    describe("POST /orders", () => {
        it("places the order in the session the code names and answers 201 with its DTO", async () => {
            await using api = await OrderRouteHarness.launch();
            const session = makeSession();
            const order = makeOrder({ sessionId: session.id, notes: "no sugar" });
            const find = api.givenSession(session);
            const create = api.givenOrderCreated(order);
            const items = [{ menuItemId: MENU_ITEM_ID, quantity: 2, customization: "oat" }];

            const { status, body } = await api.createOrder({
                sessionCode: "ABC123",
                guestName: "Ana",
                items,
                notes: "no sugar",
            });

            expect(status).toBe(201);
            expect(body).toMatchObject({ id: order.id, sessionId: session.id, notes: "no sugar" });
            expect(find.calls).toEqual([["ABC123"]]);
            expect(create.calls).toStrictEqual([
                [{ sessionId: session.id, guestName: "Ana", items, notes: "no sugar" }],
            ]);
        });

        it("passes no notes when the body carries none", async () => {
            await using api = await OrderRouteHarness.launch();
            const session = makeSession();
            api.givenSession(session);
            const create = api.givenOrderCreated(makeOrder({ sessionId: session.id }));

            const { status, body } = await api.createOrder({
                sessionCode: "ABC123",
                guestName: "Ana",
                items: [{ menuItemId: MENU_ITEM_ID, quantity: 1 }],
            });

            expect(status).toBe(201);
            expect(body).toMatchObject({ notes: null });
            expect(create.calls[0]![0]).not.toHaveProperty("notes");
        });

        it("answers 409 SESSION_CLOSED without placing the order", async () => {
            await using api = await OrderRouteHarness.launch();
            api.givenSessionFails(new SessionClosedError("ABC123"));
            const create = api.givenOrderCreated(makeOrder());

            const { status, body } = await api.createOrder({
                sessionCode: "ABC123",
                guestName: "Ana",
                items: [],
            });

            expect(status).toBe(409);
            expect(body).toMatchObject({ code: "SESSION_CLOSED" });
            expect(create.calls).toEqual([]);
        });

        it("answers 422 MENU_ITEM_NOT_AVAILABLE for an item off the menu", async () => {
            await using api = await OrderRouteHarness.launch();
            api.givenSession(makeSession());
            api.givenCreateFails(new MenuItemNotAvailableError(MENU_ITEM_ID));

            const { status, body } = await api.createOrder({
                sessionCode: "ABC123",
                guestName: "Ana",
                items: [{ menuItemId: MENU_ITEM_ID, quantity: 1 }],
            });

            expect(status).toBe(422);
            expect(body).toMatchObject({ code: "MENU_ITEM_NOT_AVAILABLE" });
        });
    });

    describe("GET /orders", () => {
        it("lists the session's orders", async () => {
            await using api = await OrderRouteHarness.launch();
            const session = makeSession();
            const orders = [
                makeOrder({ sessionId: session.id, guestName: "Ana" }),
                makeOrder({ sessionId: session.id, guestName: "Luis" }),
            ];
            const list = api.givenSessionOrders(orders);

            const { status, body } = await api.listOrders(`?sessionId=${session.id}`);

            expect(status).toBe(200);
            expect(body).toMatchObject([{ guestName: "Ana" }, { guestName: "Luis" }]);
            expect(list.calls).toEqual([[session.id]]);
        });

        it("keeps only the guest's orders when guest is given", async () => {
            await using api = await OrderRouteHarness.launch();
            const session = makeSession();
            api.givenSessionOrders([
                makeOrder({ sessionId: session.id, guestName: "Ana" }),
                makeOrder({ sessionId: session.id, guestName: "Luis" }),
            ]);

            const { body } = await api.listOrders(`?sessionId=${session.id}&guest=Luis`);

            expect(body).toMatchObject([{ guestName: "Luis" }]);
            expect(body).toHaveLength(1);
        });

        it("answers 422 without the sessionId query param", async () => {
            await using api = await OrderRouteHarness.launch();

            const { status, body } = await api.listOrders("");

            expect(status).toBe(422);
            expect(body).toEqual({
                code: "VALIDATION_ERROR",
                message: "sessionId query param required",
                statusCode: 422,
            });
        });

        it("answers a hidden 500 when the store fails", async () => {
            await using api = await OrderRouteHarness.launch();
            api.givenSessionOrdersFail(new PersistenceError(new Error("db down")));

            const { status, body } = await api.listOrders("?sessionId=x");

            expect(status).toBe(500);
            expect(body).toMatchObject({ message: "Internal server error" });
        });
    });

    describe("PATCH /orders/:id/status", () => {
        it.each([
            ["PREPARING", "preparing"],
            ["DONE", "done"],
        ])("moves the order to %s", async (wire, action) => {
            await using api = await OrderRouteHarness.launch();
            const update = api.givenStatusUpdated();

            const { status, body } = await api.updateStatus(ORDER_ID, { status: wire });

            expect(status).toBe(200);
            expect(body).toEqual({ ok: true });
            expect(update.calls).toEqual([[ORDER_ID, action]]);
        });

        it("answers 422 for a status an admin may not set, without reaching the use case", async () => {
            await using api = await OrderRouteHarness.launch();
            const update = api.givenStatusUpdated();

            const { status, body } = await api.updateStatus(ORDER_ID, { status: "CANCELLED" });

            expect(status).toBe(422);
            expect(body).toEqual({
                code: "VALIDATION_ERROR",
                message: "Invalid status value",
                statusCode: 422,
            });
            expect(update.calls).toEqual([]);
        });

        it("answers 409 INVALID_TRANSITION for a move the order cannot make", async () => {
            await using api = await OrderRouteHarness.launch();
            api.givenStatusUpdateFails(new InvalidTransitionError("PENDING", "DONE"));

            const { status, body } = await api.updateStatus(ORDER_ID, { status: "DONE" });

            expect(status).toBe(409);
            expect(body).toMatchObject({ code: "INVALID_TRANSITION" });
        });

        it("answers 404 ORDER_NOT_FOUND for an unknown order", async () => {
            await using api = await OrderRouteHarness.launch();
            api.givenStatusUpdateFails(new OrderNotFoundError(ORDER_ID));

            const { status, body } = await api.updateStatus(ORDER_ID, { status: "PREPARING" });

            expect(status).toBe(404);
            expect(body).toMatchObject({ code: "ORDER_NOT_FOUND" });
        });
    });

    describe("DELETE /orders/:id", () => {
        it("cancels the order in the path", async () => {
            await using api = await OrderRouteHarness.launch();
            const cancel = api.givenCancelSucceeds();

            const { status, body } = await api.cancelOrder(ORDER_ID);

            expect(status).toBe(200);
            expect(body).toEqual({ ok: true });
            expect(cancel.calls).toEqual([[ORDER_ID]]);
        });

        it("answers 409 ORDER_NOT_CANCELLABLE for an order past PENDING", async () => {
            await using api = await OrderRouteHarness.launch();
            api.givenCancelFails(new OrderNotCancellableError(ORDER_ID, "DONE"));

            const { status, body } = await api.cancelOrder(ORDER_ID);

            expect(status).toBe(409);
            expect(body).toMatchObject({ code: "ORDER_NOT_CANCELLABLE" });
        });

        it("answers 404 ORDER_NOT_FOUND for an unknown order", async () => {
            await using api = await OrderRouteHarness.launch();
            api.givenCancelFails(new OrderNotFoundError(ORDER_ID));

            const { status } = await api.cancelOrder(ORDER_ID);

            expect(status).toBe(404);
        });
    });
});
