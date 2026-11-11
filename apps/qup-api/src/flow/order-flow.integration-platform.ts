import { describe, expect, it } from "vitest";
import { OrderFlowHarness } from "./order-flow.harness.ts";
import type { MenuItemDto, OrderDto, SessionDto } from "@m0n0lab/qup-shared";

// Container start-up (image pull) is slow on a cold machine.
const CONTAINER_TIMEOUT = 120_000;

describe("order flow", () => {
    it(
        "streams the order and its status change to the session's watchers",
        { timeout: CONTAINER_TIMEOUT },
        async () => {
            await using api = await OrderFlowHarness.launch();
            const { body: item } = await api.addMenuItem({
                name: "Flat white",
                category: "COFFEE",
            });
            const { status: opened, body: session } = await api.openSession("Friday brunch");
            const { code, id: sessionId } = session as SessionDto;
            await using events = await api.watchSession(code);

            const { status: placed, body: order } = await api.placeOrder({
                sessionCode: code,
                guestName: "Ana",
                items: [{ menuItemId: (item as MenuItemDto).id, quantity: 2 }],
            });
            const orderId = (order as OrderDto).id;
            const { status: updated } = await api.updateStatus(orderId, "PREPARING");

            expect([opened, placed, updated]).toEqual([201, 201, 200]);
            expect(await events.next()).toEqual({
                event: "order:created",
                data: {
                    sessionId,
                    order: expect.objectContaining({
                        id: orderId,
                        status: "PENDING",
                        items: [
                            expect.objectContaining({ menuItemName: "Flat white", quantity: 2 }),
                        ],
                    }),
                },
            });
            expect(await events.next()).toEqual({
                event: "order:status",
                data: { orderId, sessionId, status: "PREPARING", updatedAt: expect.any(String) },
            });
            expect((await api.sessionOrders(sessionId)).body).toMatchObject([
                { id: orderId, status: "PREPARING" },
            ]);
        },
    );
});
