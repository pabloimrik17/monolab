import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import { Order } from "../entities/order.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import { OrderItem } from "../value-objects/order-item.ts";
import { OrderStatus } from "../value-objects/order-status.ts";
import { UpdateOrderStatusUseCase } from "./update-order-status.use-case.ts";

const makeOrder = (status: OrderStatus = OrderStatus.PENDING) =>
    Order.reconstitute({
        id: "o1",
        sessionId: "s1",
        guestName: "Alice",
        items: [OrderItem.create({ menuItemId: "mi1", menuItemName: "Espresso", quantity: 1 })],
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

describe("UpdateOrderStatusUseCase", () => {
    it("marks order as preparing", async () => {
        const order = makeOrder();
        const mockOrderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(order)),
            findBySessionId: vi.fn(),
            updateStatus: vi.fn(() => okAsync(undefined)),
        };
        const mockEventBus: EventBus = { emit: vi.fn(), on: vi.fn() };

        const useCase = new UpdateOrderStatusUseCase(mockOrderRepo, mockEventBus);
        const result = await useCase.execute("o1", "preparing");

        expect(result.isOk()).toBe(true);
        expect(mockEventBus.emit).toHaveBeenCalledWith("order:status", {
            orderId: "o1",
            status: "PREPARING",
        });
    });

    it("marks order as done", async () => {
        const order = makeOrder(OrderStatus.PREPARING);
        const mockOrderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(order)),
            findBySessionId: vi.fn(),
            updateStatus: vi.fn(() => okAsync(undefined)),
        };
        const mockEventBus: EventBus = { emit: vi.fn(), on: vi.fn() };

        const useCase = new UpdateOrderStatusUseCase(mockOrderRepo, mockEventBus);
        const result = await useCase.execute("o1", "done");

        expect(result.isOk()).toBe(true);
    });

    it("returns OrderNotFoundError for unknown id", async () => {
        const mockOrderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(null)),
            findBySessionId: vi.fn(),
            updateStatus: vi.fn(),
        };
        const mockEventBus: EventBus = { emit: vi.fn(), on: vi.fn() };

        const useCase = new UpdateOrderStatusUseCase(mockOrderRepo, mockEventBus);
        const result = await useCase.execute("unknown", "preparing");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("ORDER_NOT_FOUND");
        }
    });

    it("returns InvalidTransitionError for invalid transition", async () => {
        const order = makeOrder(OrderStatus.DONE);
        const mockOrderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(order)),
            findBySessionId: vi.fn(),
            updateStatus: vi.fn(),
        };
        const mockEventBus: EventBus = { emit: vi.fn(), on: vi.fn() };

        const useCase = new UpdateOrderStatusUseCase(mockOrderRepo, mockEventBus);
        const result = await useCase.execute("o1", "preparing");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("INVALID_TRANSITION");
        }
    });
});
