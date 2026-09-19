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
        items: order.items.slice(0, MAX_VISIBLE_ITEM_LINES).map((item) => ({
            name: item.menuItemName,
            quantity: item.quantity,
        })),
        hiddenItemCount: Math.max(0, order.items.length - MAX_VISIBLE_ITEM_LINES),
    };
}
