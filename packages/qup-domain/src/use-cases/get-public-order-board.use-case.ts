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
        return this.getSessionByCode
            .execute(rawCode)
            .andThen((session) =>
                this.orderRepo
                    .findBySessionId(session.id)
                    .map((orders) => ({ session, orders: inBoardOrder(orders) })),
            );
    }
}
