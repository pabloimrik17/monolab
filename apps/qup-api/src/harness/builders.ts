import {
    Category,
    MenuItem,
    Order,
    OrderItem,
    OrderStatus,
    Session,
    SessionCode,
    SessionStatus,
} from "@m0n0lab/qup-domain";
import type { MenuItemProps, OrderProps, SessionProps } from "@m0n0lab/qup-domain";

// qup-domain has no `./testing` subpath yet; these move there once it does (ADR 0008, builders).

export function makeSession(overrides: Partial<SessionProps> = {}): Session {
    return Session.reconstitute({
        id: crypto.randomUUID(),
        name: "Friday brunch",
        code: SessionCode.from("ABC123")._unsafeUnwrap(),
        status: SessionStatus.OPEN,
        createdAt: new Date("2026-11-06T09:00:00.000Z"),
        ...overrides,
    });
}

export function makeMenuItem(overrides: Partial<MenuItemProps> = {}): MenuItem {
    return MenuItem.reconstitute({
        id: crypto.randomUUID(),
        name: "Flat white",
        category: Category.COFFEE,
        available: true,
        sortOrder: 0,
        ...overrides,
    });
}

type OrderItemProps = Parameters<typeof OrderItem.reconstitute>[0];

export function makeOrderItem(overrides: Partial<OrderItemProps> = {}): OrderItem {
    return OrderItem.reconstitute({
        menuItemId: "6b3389b3-bff8-416e-93ad-e6d411808d95",
        menuItemName: "Flat white",
        quantity: 2,
        ...overrides,
    });
}

export function makeOrder(overrides: Partial<OrderProps> = {}): Order {
    return Order.reconstitute({
        id: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        guestName: "Ana",
        items: [makeOrderItem()],
        status: OrderStatus.PENDING,
        createdAt: new Date("2026-11-06T09:05:00.000Z"),
        updatedAt: new Date("2026-11-06T09:05:00.000Z"),
        ...overrides,
    });
}
