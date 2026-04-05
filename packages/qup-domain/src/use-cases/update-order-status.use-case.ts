import { inject, injectable } from "inversify";
import { type ResultAsync, errAsync } from "neverthrow";
import { OrderNotFoundError as OrderNotFoundErrorClass } from "../errors.ts";
import { TOKENS } from "../tokens.ts";
import type { InvalidTransitionError, OrderNotFoundError, PersistenceError } from "../errors.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { OrderRepository } from "../ports/order.repository.ts";

@injectable()
export class UpdateOrderStatusUseCase {
    constructor(
        @inject(TOKENS.OrderRepository) private readonly orderRepo: OrderRepository,
        @inject(TOKENS.EventBus) private readonly eventBus: EventBus,
    ) {}

    execute(
        orderId: string,
        action: "preparing" | "done",
    ): ResultAsync<void, OrderNotFoundError | InvalidTransitionError | PersistenceError> {
        return this.orderRepo.findById(orderId).andThen((order) => {
            if (!order) {
                return errAsync(new OrderNotFoundErrorClass(orderId));
            }

            const transitionResult =
                action === "preparing" ? order.markPreparing() : order.markDone();

            if (transitionResult.isErr()) {
                return errAsync(transitionResult.error);
            }

            return this.orderRepo.updateStatus(order).map(() => {
                try {
                    this.eventBus.emit("order:status", {
                        orderId: order.id,
                        sessionId: order.sessionId,
                        status: order.status.value,
                        updatedAt: order.updatedAt,
                    });
                } catch {
                    // Event emission failure should not fail the operation
                }
            });
        });
    }
}
