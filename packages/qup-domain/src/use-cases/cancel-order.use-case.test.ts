import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import { Order } from "../entities/order.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import { OrderItem } from "../value-objects/order-item.ts";
import { OrderStatus } from "../value-objects/order-status.ts";
import { CancelOrderUseCase } from "./cancel-order.use-case.ts";

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

describe("CancelOrderUseCase", () => {
    it("cancels a pending order", async () => {
        const order = makeOrder();
        const mockOrderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(order)),
            findBySessionId: vi.fn(),
            updateStatus: vi.fn(() => okAsync(undefined)),
        };
        const mockEventBus: EventBus = { emit: vi.fn(), on: vi.fn() };

        const useCase = new CancelOrderUseCase(mockOrderRepo, mockEventBus);
        const result = await useCase.execute("o1");

        expect(result.isOk()).toBe(true);
        expect(mockEventBus.emit).toHaveBeenCalledWith("order:cancelled", { orderId: "o1" });
    });

    it("returns OrderNotFoundError for unknown id", async () => {
        const mockOrderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(null)),
            findBySessionId: vi.fn(),
            updateStatus: vi.fn(),
        };
        const mockEventBus: EventBus = { emit: vi.fn(), on: vi.fn() };

        const useCase = new CancelOrderUseCase(mockOrderRepo, mockEventBus);
        const result = await useCase.execute("unknown");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("ORDER_NOT_FOUND");
        }
    });

    it("returns OrderNotCancellableError for preparing order", async () => {
        const order = makeOrder(OrderStatus.PREPARING);
        const mockOrderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(() => okAsync(order)),
            findBySessionId: vi.fn(),
            updateStatus: vi.fn(),
        };
        const mockEventBus: EventBus = { emit: vi.fn(), on: vi.fn() };

        const useCase = new CancelOrderUseCase(mockOrderRepo, mockEventBus);
        const result = await useCase.execute("o1");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("ORDER_NOT_CANCELLABLE");
        }
    });
});
