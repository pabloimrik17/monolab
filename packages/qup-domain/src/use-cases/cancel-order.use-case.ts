import { inject, injectable } from "inversify";
import { type ResultAsync, errAsync } from "neverthrow";

import type {
    OrderNotCancellableError,
    OrderNotFoundError,
    PersistenceError,
} from "../errors.ts";
import { OrderNotFoundError as OrderNotFoundErrorClass } from "../errors.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import { TOKENS } from "../tokens.ts";

@injectable()
export class CancelOrderUseCase {
    constructor(
        @inject(TOKENS.OrderRepository) private readonly orderRepo: OrderRepository,
        @inject(TOKENS.EventBus) private readonly eventBus: EventBus,
    ) {}

    execute(
        orderId: string,
    ): ResultAsync<void, OrderNotFoundError | OrderNotCancellableError | PersistenceError> {
        return this.orderRepo.findById(orderId).andThen((order) => {
            if (!order) {
                return errAsync(new OrderNotFoundErrorClass(orderId));
            }

            const cancelResult = order.cancel();
            if (cancelResult.isErr()) {
                return errAsync(cancelResult.error);
            }

            return this.orderRepo.updateStatus(order).map(() => {
                this.eventBus.emit("order:cancelled", { orderId: order.id });
            });
        });
    }
}
