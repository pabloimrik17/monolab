import { asc, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import { PersistenceError, type Order } from "@m0n0lab/qup-domain";
import { orderItemToRow, orderToDomain, orderToRow } from "../mappers/order.mapper.ts";
import { orderItems } from "../schema/order-items.ts";
import { orders } from "../schema/orders.ts";
import { DATA_TOKENS } from "../tokens.ts";
import type { OrderRepository } from "@m0n0lab/qup-domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

@injectable()
export class PgOrderRepository implements OrderRepository {
    constructor(@inject(DATA_TOKENS.DrizzleDb) private readonly db: NodePgDatabase) {}

    save(order: Order): ResultAsync<Order, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.transaction(async (tx) => {
                const [orderRow] = await tx.insert(orders).values(orderToRow(order)).returning();

                const itemRows = order.items.map((item) => orderItemToRow(order.id, item));
                const insertedItems =
                    itemRows.length > 0
                        ? await tx.insert(orderItems).values(itemRows).returning()
                        : [];

                return orderToDomain(orderRow!, insertedItems);
            }),
            (e) => new PersistenceError(e),
        );
    }

    findById(id: string): ResultAsync<Order | null, PersistenceError> {
        return ResultAsync.fromPromise(
            (async () => {
                const rows = await this.db.select().from(orders).where(eq(orders.id, id));

                if (rows.length === 0) return null;

                const items = await this.db
                    .select()
                    .from(orderItems)
                    .where(eq(orderItems.orderId, id))
                    .orderBy(asc(orderItems.menuItemId));

                return orderToDomain(rows[0]!, items);
            })(),
            (e) => new PersistenceError(e),
        );
    }

    findBySessionId(sessionId: string): ResultAsync<Order[], PersistenceError> {
        return ResultAsync.fromPromise(
            (async () => {
                const orderRows = await this.db
                    .select()
                    .from(orders)
                    .where(eq(orders.sessionId, sessionId))
                    .orderBy(asc(orders.createdAt));

                if (orderRows.length === 0) return [];

                const orderIds = orderRows.map((r) => r.id);
                const allItems = await this.db
                    .select()
                    .from(orderItems)
                    .where(inArray(orderItems.orderId, orderIds))
                    .orderBy(asc(orderItems.menuItemId));

                const itemsByOrderId = new Map<string, (typeof allItems)[number][]>();
                for (const item of allItems) {
                    const list = itemsByOrderId.get(item.orderId) ?? [];
                    list.push(item);
                    itemsByOrderId.set(item.orderId, list);
                }

                return orderRows.map((row) => orderToDomain(row, itemsByOrderId.get(row.id) ?? []));
            })(),
            (e) => new PersistenceError(e),
        );
    }

    updateStatus(order: Order): ResultAsync<void, PersistenceError> {
        return ResultAsync.fromPromise(
            (async () => {
                const updated = await this.db
                    .update(orders)
                    .set({ status: order.status.value, updatedAt: order.updatedAt })
                    .where(eq(orders.id, order.id))
                    .returning({ id: orders.id });
                if (updated.length === 0) {
                    throw new Error(`Order ${order.id} not found`);
                }
            })(),
            (e) => new PersistenceError(e),
        );
    }
}
