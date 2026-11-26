// Public projection only. Deliberately never imports the complete-DTO serializers, so no
// endpoint reachable without the admin PIN has a path to notes, customizations, menu item
// ids, or the session id.
import { boardVisibleUntil } from "@m0n0lab/qup-domain";
import type { Order, Session } from "@m0n0lab/qup-domain";
import type { PublicOrderBoardDto, PublicOrderSummaryDto } from "@m0n0lab/qup-shared";

const MAX_VISIBLE_ITEM_LINES = 3;

// Built field by field from the entity: an unauthenticated caller can only ever
// receive this shape, for the board and for the per-guest read alike.
export function toPublicOrderSummary(order: Order): PublicOrderSummaryDto {
    return {
        id: order.id,
        guestName: order.guestName,
        status: order.status.value as PublicOrderSummaryDto["status"],
        // Storage does not preserve item order, so sorting by name makes the truncation
        // deterministic. Order freezes its items: an in-place sort would throw at runtime.
        items: [...order.items]
            .sort((a, b) => a.menuItemName.localeCompare(b.menuItemName))
            .slice(0, MAX_VISIBLE_ITEM_LINES)
            .map((item) => ({
                name: item.menuItemName,
                quantity: item.quantity,
            })),
        hiddenItemCount: Math.max(0, order.items.length - MAX_VISIBLE_ITEM_LINES),
        // Absolute, from the domain's single retention rule, so the client never has to
        // know the window lengths and the two public reads cannot disagree.
        visibleUntil: boardVisibleUntil(order)?.toISOString() ?? null,
    };
}

export function toPublicOrderBoardDto(session: Session, orders: Order[]): PublicOrderBoardDto {
    return {
        sessionName: session.name,
        sessionCode: session.code.value,
        // map, never regroup or re-sort: the use case already ordered these for the
        // board's sections, and the projection carries no timestamp to re-sort on.
        orders: orders.map(toPublicOrderSummary),
    };
}
