import { inject, injectable } from "inversify";
import { TOKENS } from "../tokens.ts";
import type { Order } from "../entities/order.ts";
import type { PersistenceError } from "../errors.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import type { ResultAsync } from "neverthrow";

@injectable()
export class GetSessionOrdersUseCase {
    constructor(@inject(TOKENS.OrderRepository) private readonly orderRepo: OrderRepository) {}

    execute(sessionId: string): ResultAsync<Order[], PersistenceError> {
        return this.orderRepo.findBySessionId(sessionId);
    }
}
