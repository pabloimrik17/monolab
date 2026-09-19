import type { Order } from "@m0n0lab/qup-domain";
import type { PublicOrderSummaryDto } from "@m0n0lab/qup-shared";

const MAX_VISIBLE_ITEM_LINES = 3;

// Deliberately built field by field from the entity, with no import of the complete
// DTO serializers: an unauthenticated caller can only ever receive this shape.
export function toPublicOrderSummary(order: Order): PublicOrderSummaryDto {
    return {
        id: order.id,
        guestName: order.guestName,
        status: order.status.value as PublicOrderSummaryDto["status"],
        // Sorted by product name: storage does not preserve the order's own item
        // order, so name ordering is what makes the truncation to 3 deterministic.
        items: [...order.items]
            .sort((a, b) => a.menuItemName.localeCompare(b.menuItemName))
            .slice(0, MAX_VISIBLE_ITEM_LINES)
            .map((item) => ({
                name: item.menuItemName,
                quantity: item.quantity,
            })),
        hiddenItemCount: Math.max(0, order.items.length - MAX_VISIBLE_ITEM_LINES),
    };
}
