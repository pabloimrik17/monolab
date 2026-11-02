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
import type { UpdateOrderStatusUseCase } from "./update-order-status.use-case.ts";

describe("UpdateOrderStatusUseCase", () => {
    let orders: Order[];
    let updated: Order[];
    let events: unknown[][];
    let updateStatus: UpdateOrderStatusUseCase;

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
        updateStatus = container.get<UpdateOrderStatusUseCase>(TOKENS.UpdateOrderStatusUseCase);
    });

    describe("moving an order along", () => {
        it("stores a pending order as preparing and announces its new status", async () => {
            const order = givenPendingOrder();

            const result = await updateStatus.execute(order.id, "preparing");

            expect(result.isOk()).toBe(true);
            expect(updated).toEqual([order]);
            expect(order.status).toBe(OrderStatus.PREPARING);
            expect(events).toEqual([
                [
                    "order:status",
                    {
                        orderId: order.id,
                        sessionId: "s-1",
                        status: "PREPARING",
                        updatedAt: order.updatedAt,
                    },
                ],
            ]);
        });

        it("stores an order being prepared as done", async () => {
            const order = givenPendingOrder();
            order.markPreparing();

            const result = await updateStatus.execute(order.id, "done");

            expect(result.isOk()).toBe(true);
            expect(updated).toEqual([order]);
            expect(order.status).toBe(OrderStatus.DONE);
        });

        it("refuses an unknown order", async () => {
            const error = (await updateStatus.execute("unknown", "preparing"))._unsafeUnwrapErr();

            expect(error.code).toBe("ORDER_NOT_FOUND");
        });

        it("refuses to skip preparation, storing and announcing nothing", async () => {
            const order = givenPendingOrder();

            const error = (await updateStatus.execute(order.id, "done"))._unsafeUnwrapErr();

            expect(error.code).toBe("INVALID_TRANSITION");
            expect(updated).toEqual([]);
            expect(events).toEqual([]);
        });
    });
});
