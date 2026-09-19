import { inject, injectable } from "inversify";
import { TOKENS } from "../tokens.ts";
import type { Order } from "../entities/order.ts";
import type { Session } from "../entities/session.ts";
import type {
    InvalidCodeError,
    PersistenceError,
    SessionClosedError,
    SessionNotFoundError,
} from "../errors.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import type { GetSessionByCodeUseCase } from "./get-session-by-code.use-case.ts";
import type { ResultAsync } from "neverthrow";

export interface PublicOrderBoard {
    session: Session;
    orders: Order[];
}

// Server-authoritative retention (Q24): a finished order stays on the board for a fixed
// window after its last status change. `updatedAt` is exactly that instant, since every
// transition refreshes it. PENDING and PREPARING never expire.
const DONE_RETENTION_MS = 5 * 60 * 1000;
const CANCELLED_RETENTION_MS = 2 * 60 * 1000;

function retentionWindowMs(status: string): number | null {
    switch (status) {
        case "DONE":
            return DONE_RETENTION_MS;
        case "CANCELLED":
            return CANCELLED_RETENTION_MS;
        default:
            return null;
    }
}

// The one place the retention window is expressed. The board use case drops orders past
// their deadline with it, and the API serializer stamps `visibleUntil` with it, so the
// snapshot and the per-guest read can never disagree about when an order ages off.
export function boardVisibleUntil(order: Order): Date | null {
    const windowMs = retentionWindowMs(order.status.value);
    return windowMs === null ? null : new Date(order.updatedAt.getTime() + windowMs);
}

function isVisibleAt(order: Order, now: number): boolean {
    const deadline = boardVisibleUntil(order);
    return deadline === null || deadline.getTime() > now;
}

const oldestFirst = (a: Order, b: Order) => a.createdAt.getTime() - b.createdAt.getTime();
const newestChangeFirst = (a: Order, b: Order) => b.updatedAt.getTime() - a.updatedAt.getTime();

function bucket(orders: Order[], status: string, compare: (a: Order, b: Order) => number): Order[] {
    return orders.filter((order) => order.status.value === status).sort(compare);
}

// The board's public projection carries no timestamp, so the client cannot sort it. The
// board order therefore has to be decided here: PENDING then PREPARING oldest first,
// DONE then CANCELLED newest change first. The board renders each section in array order.
function inBoardOrder(orders: Order[]): Order[] {
    return [
        ...bucket(orders, "PENDING", oldestFirst),
        ...bucket(orders, "PREPARING", oldestFirst),
        ...bucket(orders, "DONE", newestChangeFirst),
        ...bucket(orders, "CANCELLED", newestChangeFirst),
    ];
}

@injectable()
export class GetPublicOrderBoardUseCase {
    constructor(
        @inject(TOKENS.GetSessionByCodeUseCase)
        private readonly getSessionByCode: GetSessionByCodeUseCase,
        @inject(TOKENS.OrderRepository) private readonly orderRepo: OrderRepository,
    ) {}

    execute(
        rawCode: string,
    ): ResultAsync<
        PublicOrderBoard,
        InvalidCodeError | SessionNotFoundError | SessionClosedError | PersistenceError
    > {
        return this.getSessionByCode.execute(rawCode).andThen((session) =>
            this.orderRepo.findBySessionId(session.id).map((orders) => {
                const now = Date.now();
                return {
                    session,
                    // Retention only governs visibility: expired orders are left out of
                    // this snapshot and never touched in storage.
                    orders: inBoardOrder(orders.filter((order) => isVisibleAt(order, now))),
                };
            }),
        );
    }
}
