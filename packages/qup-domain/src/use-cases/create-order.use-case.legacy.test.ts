import { Container } from "inversify";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it } from "vitest";
import { domainModule } from "../domain.module.ts";
import { MenuItem } from "../entities/menu-item.ts";
import { Session } from "../entities/session.ts";
import { TOKENS } from "../tokens.ts";
import { Category } from "../value-objects/category.ts";
import { OrderStatus } from "../value-objects/order-status.ts";
import type { Order } from "../entities/order.ts";
import type { EventBus } from "../ports/event-bus.ts";
import type { MenuItemRepository } from "../ports/menu-item.repository.ts";
import type { OrderRepository } from "../ports/order.repository.ts";
import type { SessionRepository } from "../ports/session.repository.ts";
import type { CreateOrderUseCase } from "./create-order.use-case.ts";

describe("CreateOrderUseCase", () => {
    let session: Session;
    let espresso: MenuItem;
    let latte: MenuItem;
    let saved: Order[];
    let events: unknown[][];
    let create: CreateOrderUseCase;

    beforeEach(() => {
        session = Session.create({ name: "Coffee Run" })._unsafeUnwrap();
        espresso = MenuItem.create({ name: "Espresso", category: Category.COFFEE })._unsafeUnwrap();
        latte = MenuItem.create({ name: "Latte", category: Category.COFFEE })._unsafeUnwrap();
        saved = [];
        events = [];
        const container = new Container();
        container.load(domainModule);
        container.bind(TOKENS.SessionRepository).toConstantValue({
            findById: (id: string) => okAsync(id === session.id ? session : null),
        } satisfies Partial<SessionRepository>);
        container.bind(TOKENS.MenuItemRepository).toConstantValue({
            findAll: () => okAsync([espresso, latte]),
        } satisfies Partial<MenuItemRepository>);
        container.bind(TOKENS.OrderRepository).toConstantValue({
            save: (order: Order) => {
                saved.push(order);
                return okAsync(order);
            },
        } satisfies Partial<OrderRepository>);
        container.bind(TOKENS.EventBus).toConstantValue({
            emit: (...event: unknown[]) => events.push(event),
        } satisfies Partial<EventBus>);
        create = container.get<CreateOrderUseCase>(TOKENS.CreateOrderUseCase);
    });

    describe("placing an order", () => {
        it("stores the guest's pending order with the chosen menu items and announces it", async () => {
            const order = (
                await create.execute({
                    sessionId: session.id,
                    guestName: "Alice",
                    items: [{ menuItemId: latte.id, quantity: 2, customization: "oat milk" }],
                    notes: "at the window",
                })
            )._unsafeUnwrap();

            expect(order).toMatchObject({
                sessionId: session.id,
                guestName: "Alice",
                notes: "at the window",
            });
            expect(order.status).toBe(OrderStatus.PENDING);
            expect(order.items).toEqual([
                {
                    menuItemId: latte.id,
                    menuItemName: "Latte",
                    quantity: 2,
                    customization: "oat milk",
                },
            ]);
            expect(saved).toEqual([order]);
            // Exact payload: the bus feeds a public stream, so only the session id rides on it.
            expect(events).toEqual([["order:created", { sessionId: session.id }]]);
        });

        it("refuses an unknown session", async () => {
            const error = (
                await create.execute({
                    sessionId: "unknown",
                    guestName: "Alice",
                    items: [{ menuItemId: espresso.id, quantity: 1 }],
                })
            )._unsafeUnwrapErr();

            expect(error.code).toBe("SESSION_NOT_FOUND");
        });

        it("refuses a closed session, storing nothing", async () => {
            session.close();

            const error = (
                await create.execute({
                    sessionId: session.id,
                    guestName: "Alice",
                    items: [{ menuItemId: espresso.id, quantity: 1 }],
                })
            )._unsafeUnwrapErr();

            expect(error.code).toBe("SESSION_CLOSED");
            expect(saved).toEqual([]);
        });

        it("refuses an item that is not on the menu", async () => {
            const error = (
                await create.execute({
                    sessionId: session.id,
                    guestName: "Alice",
                    items: [{ menuItemId: "unknown", quantity: 1 }],
                })
            )._unsafeUnwrapErr();

            expect(error.code).toBe("MENU_ITEM_NOT_FOUND");
        });

        it("refuses a quantity of zero, storing nothing", async () => {
            const error = (
                await create.execute({
                    sessionId: session.id,
                    guestName: "Alice",
                    items: [{ menuItemId: espresso.id, quantity: 0 }],
                })
            )._unsafeUnwrapErr();

            expect(error.code).toBe("VALIDATION_ERROR");
            expect(saved).toEqual([]);
        });

        it("refuses an item that is sold out, storing and announcing nothing", async () => {
            latte.update({ available: false });

            const error = (
                await create.execute({
                    sessionId: session.id,
                    guestName: "Alice",
                    items: [
                        { menuItemId: espresso.id, quantity: 1 },
                        { menuItemId: latte.id, quantity: 1 },
                    ],
                })
            )._unsafeUnwrapErr();

            expect(error.code).toBe("MENU_ITEM_NOT_AVAILABLE");
            expect(saved).toEqual([]);
            expect(events).toEqual([]);
        });
    });
});
