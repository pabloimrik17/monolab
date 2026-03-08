import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { Order } from "../entities/order.ts";
import { OrderItem } from "../value-objects/order-item.ts";
import { OrderStatus } from "../value-objects/order-status.ts";
import { GetSessionOrdersUseCase } from "./get-session-orders.use-case.ts";
import type { OrderRepository } from "../ports/order.repository.ts";

describe("GetSessionOrdersUseCase", () => {
    it("returns orders for session", async () => {
        const order = Order.reconstitute({
            id: "o1",
            sessionId: "s1",
            guestName: "Alice",
            items: [OrderItem.create({ menuItemId: "mi1", menuItemName: "Espresso", quantity: 1 })],
            status: OrderStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const mockOrderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(),
            findBySessionId: vi.fn(() => okAsync([order])),
            updateStatus: vi.fn(),
        };

        const useCase = new GetSessionOrdersUseCase(mockOrderRepo);
        const result = await useCase.execute("s1");

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toHaveLength(1);
            expect(result.value[0]?.id).toBe("o1");
        }
    });

    it("returns empty array when no orders", async () => {
        const mockOrderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(),
            findBySessionId: vi.fn(() => okAsync([])),
            updateStatus: vi.fn(),
        };

        const useCase = new GetSessionOrdersUseCase(mockOrderRepo);
        const result = await useCase.execute("s1");

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toHaveLength(0);
        }
    });
});
