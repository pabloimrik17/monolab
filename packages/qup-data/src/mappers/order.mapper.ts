import { Order, OrderItem, OrderStatus } from "@m0n0lab/qup-domain";
import type { orderItems } from "../schema/order-items.ts";
import type { orders } from "../schema/orders.ts";

type OrderRow = typeof orders.$inferSelect;
type OrderInsert = typeof orders.$inferInsert;
type OrderItemRow = typeof orderItems.$inferSelect;
type OrderItemInsert = typeof orderItems.$inferInsert;

export function orderToDomain(row: OrderRow, itemRows: OrderItemRow[]): Order {
    const items = itemRows.map((ir) =>
        OrderItem.reconstitute({
            menuItemId: ir.menuItemId,
            menuItemName: ir.menuItemName,
            quantity: ir.quantity,
            ...(ir.customization != null && { customization: ir.customization }),
        }),
    );

    return Order.reconstitute({
        id: row.id,
        sessionId: row.sessionId,
        guestName: row.guestName,
        items,
        status: OrderStatus.from(row.status),
        ...(row.notes != null && { notes: row.notes }),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}

export function orderToRow(order: Order): OrderInsert {
    return {
        id: order.id,
        sessionId: order.sessionId,
        guestName: order.guestName,
        status: order.status.value,
        notes: order.notes ?? null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };
}

export function orderItemToRow(orderId: string, item: OrderItem): OrderItemInsert {
    return {
        id: crypto.randomUUID(),
        orderId,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        customization: item.customization ?? null,
    };
}
