import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { MenuItem } from "../entities/menu-item.ts";
import { Session } from "../entities/session.ts";
import { Category } from "../value-objects/category.ts";
import { CreateOrderUseCase } from "./create-order.use-case.ts";
import type { Order } from "../entities/order.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import type { SessionRepository } from "../ports/session.repository.ts";

const createMocks = () => {
    const session = Session.create({ name: "Test" });
    if (session.isErr()) {
        throw new Error("unexpected");
    }

    const menuItem = MenuItem.create({ name: "Espresso", category: Category.COFFEE });
    if (menuItem.isErr()) {
        throw new Error("unexpected");
    }

    const mockSessionRepo: SessionRepository = {
        save: vi.fn(),
        findByCode: vi.fn(),
        findById: vi.fn(() => okAsync(session.value)),
        updateStatus: vi.fn(),
    };

    const mockOrderRepo: OrderRepository = {
        save: vi.fn((order: Order) => okAsync(order)),
        findById: vi.fn(),
        findBySessionId: vi.fn(),
        updateStatus: vi.fn(),
    };

    const mockMenuItemRepo: MenuItemRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(() => okAsync([menuItem.value])),
        findAllAvailable: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const mockEventBus: EventBus = {
        emit: vi.fn(),
        on: vi.fn(),
    };

    return {
        session: session.value,
        menuItem: menuItem.value,
        mockSessionRepo,
        mockOrderRepo,
        mockMenuItemRepo,
        mockEventBus,
    };
};

describe("CreateOrderUseCase", () => {
    it("creates an order for open session with available items", async () => {
        const {
            session,
            menuItem,
            mockSessionRepo,
            mockOrderRepo,
            mockMenuItemRepo,
            mockEventBus,
        } = createMocks();

        const useCase = new CreateOrderUseCase(
            mockSessionRepo,
            mockOrderRepo,
            mockMenuItemRepo,
            mockEventBus,
        );
        const result = await useCase.execute({
            sessionId: session.id,
            guestName: "Alice",
            items: [{ menuItemId: menuItem.id, quantity: 2 }],
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.guestName).toBe("Alice");
            expect(result.value.items).toHaveLength(1);
            expect(mockEventBus.emit).toHaveBeenCalledWith(
                "order:created",
                expect.objectContaining({
                    orderId: result.value.id,
                }),
            );
        }
    });

    it("returns SessionNotFoundError for unknown session", async () => {
        const { mockOrderRepo, mockMenuItemRepo, mockEventBus } = createMocks();

        const mockSessionRepo: SessionRepository = {
            save: vi.fn(),
            findByCode: vi.fn(),
            findById: vi.fn(() => okAsync(null)),
            updateStatus: vi.fn(),
        };

        const useCase = new CreateOrderUseCase(
            mockSessionRepo,
            mockOrderRepo,
            mockMenuItemRepo,
            mockEventBus,
        );
        const result = await useCase.execute({
            sessionId: "unknown",
            guestName: "Alice",
            items: [{ menuItemId: "item-1", quantity: 1 }],
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("SESSION_NOT_FOUND");
        }
    });

    it("returns SessionClosedError for closed session", async () => {
        const { session, mockOrderRepo, mockMenuItemRepo, mockEventBus } = createMocks();
        session.close();

        const mockSessionRepo: SessionRepository = {
            save: vi.fn(),
            findByCode: vi.fn(),
            findById: vi.fn(() => okAsync(session)),
            updateStatus: vi.fn(),
        };

        const useCase = new CreateOrderUseCase(
            mockSessionRepo,
            mockOrderRepo,
            mockMenuItemRepo,
            mockEventBus,
        );
        const result = await useCase.execute({
            sessionId: session.id,
            guestName: "Alice",
            items: [{ menuItemId: "item-1", quantity: 1 }],
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("SESSION_CLOSED");
        }
    });

    it("returns MenuItemNotFoundError for unknown menu item", async () => {
        const { session, mockSessionRepo, mockOrderRepo, mockEventBus } = createMocks();

        const mockMenuItemRepo: MenuItemRepository = {
            save: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(() => okAsync([])),
            findAllAvailable: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };

        const useCase = new CreateOrderUseCase(
            mockSessionRepo,
            mockOrderRepo,
            mockMenuItemRepo,
            mockEventBus,
        );
        const result = await useCase.execute({
            sessionId: session.id,
            guestName: "Alice",
            items: [{ menuItemId: "nonexistent", quantity: 1 }],
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("MENU_ITEM_NOT_FOUND");
        }
    });

    it("returns MenuItemNotAvailableError for unavailable menu item", async () => {
        const { session, mockSessionRepo, mockOrderRepo, mockEventBus } = createMocks();

        const unavailableItem = MenuItem.create({
            name: "Sold Out",
            category: Category.COFFEE,
            available: false,
        });
        if (unavailableItem.isErr()) {
            throw new Error("unexpected");
        }

        const mockMenuItemRepo: MenuItemRepository = {
            save: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(() => okAsync([unavailableItem.value])),
            findAllAvailable: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };

        const useCase = new CreateOrderUseCase(
            mockSessionRepo,
            mockOrderRepo,
            mockMenuItemRepo,
            mockEventBus,
        );
        const result = await useCase.execute({
            sessionId: session.id,
            guestName: "Alice",
            items: [{ menuItemId: unavailableItem.value.id, quantity: 1 }],
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("MENU_ITEM_NOT_AVAILABLE");
        }
    });
});
