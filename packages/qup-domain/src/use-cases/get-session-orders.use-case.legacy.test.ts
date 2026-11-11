import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { Order } from "../entities/order.ts";
import { TOKENS } from "../tokens.ts";
import { OrderItem } from "../value-objects/order-item.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import type { GetSessionOrdersUseCase } from "./get-session-orders.use-case.ts";

describe("GetSessionOrdersUseCase", () => {
    let orders: Order[];
    let getOrders: GetSessionOrdersUseCase;

    function givenOrder(sessionId: string): Order {
        const items = [
            OrderItem.create({
                menuItemId: "mi-1",
                menuItemName: "Espresso",
                quantity: 1,
            })._unsafeUnwrap(),
        ];
        const order = Order.create({ sessionId, guestName: "Alice", items })._unsafeUnwrap();
        orders.push(order);
        return order;
    }

    beforeEach(() => {
        orders = [];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.OrderRepository).toConstantValue({
            findBySessionId: (sessionId: string) =>
                okAsync(orders.filter((order) => order.sessionId === sessionId)),
        } satisfies Partial<OrderRepository>);
        getOrders = container.get<GetSessionOrdersUseCase>(TOKENS.GetSessionOrdersUseCase);
    });

    describe("listing a session's orders", () => {
        it("lists the orders placed in that session only", async () => {
            const mine = givenOrder("s-1");
            givenOrder("s-2");

            const listed = (await getOrders.execute("s-1"))._unsafeUnwrap();

            expect(listed).toEqual([mine]);
        });
    });
});
