import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { Order } from "../entities/order.ts";
import { TOKENS } from "../tokens.ts";
import { OrderItem } from "../value-objects/order-item.ts";
import { OrderStatus } from "../value-objects/order-status.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import type { CancelOrderUseCase } from "./cancel-order.use-case.ts";

describe("CancelOrderUseCase", () => {
    let orders: Order[];
    let updated: Order[];
    let events: unknown[][];
    let cancel: CancelOrderUseCase;

    function givenPendingOrder(): Order {
        const items = [
            OrderItem.create({
                menuItemId: "mi-1",
                menuItemName: "Espresso",
                quantity: 1,
            })._unsafeUnwrap(),
        ];
        const order = Order.create({ sessionId: "s-1", guestName: "Alice", items })._unsafeUnwrap();
        orders.push(order);
        return order;
    }

    beforeEach(() => {
        orders = [];
        updated = [];
        events = [];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.OrderRepository).toConstantValue({
            findById: (id: string) => okAsync(orders.find((order) => order.id === id) ?? null),
            updateStatus: (order: Order) => {
                updated.push(order);
                return okAsync(undefined);
            },
        } satisfies Partial<OrderRepository>);
        container.bind(TOKENS.EventBus).toConstantValue({
            emit: (...event: unknown[]) => events.push(event),
        } satisfies Partial<EventBus>);
        cancel = container.get<CancelOrderUseCase>(TOKENS.CancelOrderUseCase);
    });

    describe("cancelling an order", () => {
        it("stores a pending order as cancelled and announces it", async () => {
            const order = givenPendingOrder();

            const result = await cancel.execute(order.id);

            expect(result.isOk()).toBe(true);
            expect(updated).toEqual([order]);
            expect(order.status).toBe(OrderStatus.CANCELLED);
            expect(events).toEqual([["order:cancelled", { orderId: order.id, sessionId: "s-1" }]]);
        });

        it("refuses an unknown order", async () => {
            const error = (await cancel.execute("unknown"))._unsafeUnwrapErr();

            expect(error.code).toBe("ORDER_NOT_FOUND");
        });

        it("refuses an order already being prepared, storing and announcing nothing", async () => {
            const order = givenPendingOrder();
            order.markPreparing();

            const error = (await cancel.execute(order.id))._unsafeUnwrapErr();

            expect(error.code).toBe("ORDER_NOT_CANCELLABLE");
            expect(updated).toEqual([]);
            expect(events).toEqual([]);
        });
    });
});
