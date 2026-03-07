import { describe, expect, it } from "vitest";

import { OrderItem } from "../value-objects/order-item.ts";
import { OrderStatus } from "../value-objects/order-status.ts";
import { Order } from "./order.ts";

const makeItem = (overrides?: Partial<{ menuItemId: string; menuItemName: string; quantity: number }>) =>
    OrderItem.create({
        menuItemId: overrides?.menuItemId ?? "item-1",
        menuItemName: overrides?.menuItemName ?? "Espresso",
        quantity: overrides?.quantity ?? 1,
    });

describe("Order", () => {
    describe("create", () => {
        it("creates an order with PENDING status", () => {
            const result = Order.create({
                sessionId: "session-1",
                guestName: "Alice",
                items: [makeItem()],
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const order = result.value;
                expect(order.guestName).toBe("Alice");
                expect(order.status.equals(OrderStatus.PENDING)).toBe(true);
                expect(order.items).toHaveLength(1);
                expect(order.id).toBeDefined();
            }
        });

        it("returns EmptyOrderError for empty items", () => {
            const result = Order.create({
                sessionId: "session-1",
                guestName: "Alice",
                items: [],
            });
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("EMPTY_ORDER");
            }
        });

        it("returns ValidationError for empty guest name", () => {
            const result = Order.create({
                sessionId: "session-1",
                guestName: "",
                items: [makeItem()],
            });
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it("trims guest name", () => {
            const result = Order.create({
                sessionId: "session-1",
                guestName: "  Bob  ",
                items: [makeItem()],
            });
            if (result.isOk()) {
                expect(result.value.guestName).toBe("Bob");
            }
        });
    });

    describe("markPreparing", () => {
        it("transitions from PENDING to PREPARING", () => {
            const order = Order.create({
                sessionId: "s1",
                guestName: "Alice",
                items: [makeItem()],
            });
            if (order.isOk()) {
                const result = order.value.markPreparing();
                expect(result.isOk()).toBe(true);
                expect(order.value.status.equals(OrderStatus.PREPARING)).toBe(true);
            }
        });

        it("fails from DONE", () => {
            const order = Order.reconstitute({
                id: "o1",
                sessionId: "s1",
                guestName: "Alice",
                items: [makeItem()],
                status: OrderStatus.DONE,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = order.markPreparing();
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("INVALID_TRANSITION");
            }
        });
    });

    describe("markDone", () => {
        it("transitions from PREPARING to DONE", () => {
            const order = Order.reconstitute({
                id: "o1",
                sessionId: "s1",
                guestName: "Alice",
                items: [makeItem()],
                status: OrderStatus.PREPARING,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = order.markDone();
            expect(result.isOk()).toBe(true);
            expect(order.status.equals(OrderStatus.DONE)).toBe(true);
        });

        it("fails from PENDING", () => {
            const order = Order.create({
                sessionId: "s1",
                guestName: "Alice",
                items: [makeItem()],
            });
            if (order.isOk()) {
                const result = order.value.markDone();
                expect(result.isErr()).toBe(true);
            }
        });
    });

    describe("cancel", () => {
        it("cancels a PENDING order", () => {
            const order = Order.create({
                sessionId: "s1",
                guestName: "Alice",
                items: [makeItem()],
            });
            if (order.isOk()) {
                const result = order.value.cancel();
                expect(result.isOk()).toBe(true);
                expect(order.value.status.equals(OrderStatus.CANCELLED)).toBe(true);
            }
        });

        it("returns OrderNotCancellableError for PREPARING order", () => {
            const order = Order.reconstitute({
                id: "o1",
                sessionId: "s1",
                guestName: "Alice",
                items: [makeItem()],
                status: OrderStatus.PREPARING,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = order.cancel();
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("ORDER_NOT_CANCELLABLE");
            }
        });

        it("returns OrderNotCancellableError for DONE order", () => {
            const order = Order.reconstitute({
                id: "o1",
                sessionId: "s1",
                guestName: "Alice",
                items: [makeItem()],
                status: OrderStatus.DONE,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = order.cancel();
            expect(result.isErr()).toBe(true);
        });
    });

    describe("reconstitute", () => {
        it("hydrates order from raw props", () => {
            const order = Order.reconstitute({
                id: "o1",
                sessionId: "s1",
                guestName: "Bob",
                items: [makeItem()],
                status: OrderStatus.DONE,
                notes: "Extra hot",
                createdAt: new Date("2024-01-01"),
                updatedAt: new Date("2024-01-02"),
            });
            expect(order.id).toBe("o1");
            expect(order.status.equals(OrderStatus.DONE)).toBe(true);
            expect(order.notes).toBe("Extra hot");
        });
    });
});
