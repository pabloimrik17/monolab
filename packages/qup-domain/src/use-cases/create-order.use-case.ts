import { inject, injectable } from "inversify";
import { type ResultAsync, errAsync } from "neverthrow";
import { Order } from "../entities/order.ts";
import {
    MenuItemNotAvailableError as MenuItemNotAvailableErrorClass,
    MenuItemNotFoundError as MenuItemNotFoundErrorClass,
    SessionClosedError as SessionClosedErrorClass,
    SessionNotFoundError as SessionNotFoundErrorClass,
} from "../errors.ts";
import { TOKENS } from "../tokens.ts";
import { OrderItem } from "../value-objects/order-item.ts";
import type {
    EmptyOrderError,
    MenuItemNotAvailableError,
    MenuItemNotFoundError,
    PersistenceError,
    SessionClosedError,
    SessionNotFoundError,
    ValidationError,
} from "../errors.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import type { SessionRepository } from "../ports/session.repository.ts";

export interface CreateOrderInput {
    sessionId: string;
    guestName: string;
    items: { menuItemId: string; quantity: number; customization?: string }[];
    notes?: string;
}

@injectable()
export class CreateOrderUseCase {
    constructor(
        @inject(TOKENS.SessionRepository) private readonly sessionRepo: SessionRepository,
        @inject(TOKENS.OrderRepository) private readonly orderRepo: OrderRepository,
        @inject(TOKENS.MenuItemRepository) private readonly menuItemRepo: MenuItemRepository,
        @inject(TOKENS.EventBus) private readonly eventBus: EventBus,
    ) {}

    execute(
        input: CreateOrderInput,
    ): ResultAsync<
        Order,
        | SessionNotFoundError
        | SessionClosedError
        | MenuItemNotFoundError
        | MenuItemNotAvailableError
        | EmptyOrderError
        | ValidationError
        | PersistenceError
    > {
        return this.sessionRepo.findById(input.sessionId).andThen((session) => {
            if (!session) {
                return errAsync(new SessionNotFoundErrorClass(input.sessionId));
            }
            if (!session.isOpen()) {
                return errAsync(new SessionClosedErrorClass(input.sessionId));
            }

            return this.menuItemRepo.findAll().andThen((menuItems) => {
                const orderItems: OrderItem[] = [];

                for (const itemInput of input.items) {
                    const menuItem = menuItems.find((mi) => mi.id === itemInput.menuItemId);
                    if (!menuItem) {
                        return errAsync(new MenuItemNotFoundErrorClass(itemInput.menuItemId));
                    }
                    if (!menuItem.available) {
                        return errAsync(new MenuItemNotAvailableErrorClass(itemInput.menuItemId));
                    }
                    orderItems.push(
                        OrderItem.create({
                            menuItemId: menuItem.id,
                            menuItemName: menuItem.name,
                            quantity: itemInput.quantity,
                            customization: itemInput.customization,
                        }),
                    );
                }

                const orderResult = Order.create({
                    sessionId: input.sessionId,
                    guestName: input.guestName,
                    items: orderItems,
                    notes: input.notes,
                });

                if (orderResult.isErr()) {
                    return errAsync(orderResult.error);
                }

                return this.orderRepo.save(orderResult.value).map((saved) => {
                    this.eventBus.emit("order:created", {
                        orderId: saved.id,
                        sessionId: saved.sessionId,
                    });
                    return saved;
                });
            });
        });
    }
}
