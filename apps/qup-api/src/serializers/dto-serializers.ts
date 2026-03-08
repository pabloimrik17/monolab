import type { MenuItem, Order, Session } from "@m0n0lab/qup-domain";
import type { MenuItemDto, OrderDto, SessionDto } from "@m0n0lab/qup-shared";

export function toSessionDto(session: Session): SessionDto {
    return {
        id: session.id,
        name: session.name,
        code: session.code.value,
        status: session.status as "OPEN" | "CLOSED",
        createdAt: session.createdAt.toISOString(),
        closedAt: session.closedAt?.toISOString() ?? null,
    };
}

export function toOrderDto(order: Order): OrderDto {
    return {
        id: order.id,
        sessionId: order.sessionId,
        guestName: order.guestName,
        items: order.items.map((item) => ({
            id: crypto.randomUUID(),
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            customization: item.customization ?? null,
        })),
        status: order.status.value as OrderDto["status"],
        notes: order.notes ?? null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
    };
}

export function toMenuItemDto(menuItem: MenuItem): MenuItemDto {
    return {
        id: menuItem.id,
        name: menuItem.name,
        category: menuItem.category as MenuItemDto["category"],
        description: menuItem.description ?? null,
        available: menuItem.available,
        sortOrder: menuItem.sortOrder,
    };
}
