import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import { PersistenceError, type MenuItem } from "@m0n0lab/qup-domain";
import { menuItemToDomain, menuItemToRow } from "../mappers/menu-item.mapper.ts";
import { menuItems } from "../schema/menu-items.ts";
import { DATA_TOKENS } from "../tokens.ts";
import type { MenuItemRepository } from "@m0n0lab/qup-domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

@injectable()
export class PgMenuItemRepository implements MenuItemRepository {
    constructor(@inject(DATA_TOKENS.DrizzleDb) private readonly db: NodePgDatabase) {}

    save(menuItem: MenuItem): ResultAsync<MenuItem, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.insert(menuItems).values(menuItemToRow(menuItem)).returning(),
            (e) => new PersistenceError(e),
        ).map((rows) => menuItemToDomain(rows[0]!));
    }

    findById(id: string): ResultAsync<MenuItem | null, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(menuItems).where(eq(menuItems.id, id)),
            (e) => new PersistenceError(e),
        ).map((rows) => (rows.length > 0 ? menuItemToDomain(rows[0]!) : null));
    }

    findAll(): ResultAsync<MenuItem[], PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(menuItems).orderBy(menuItems.sortOrder),
            (e) => new PersistenceError(e),
        ).map((rows) => rows.map(menuItemToDomain));
    }

    findAllAvailable(): ResultAsync<MenuItem[], PersistenceError> {
        return ResultAsync.fromPromise(
            this.db
                .select()
                .from(menuItems)
                .where(eq(menuItems.available, true))
                .orderBy(menuItems.sortOrder),
            (e) => new PersistenceError(e),
        ).map((rows) => rows.map(menuItemToDomain));
    }

    update(menuItem: MenuItem): ResultAsync<void, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db
                .update(menuItems)
                .set({
                    name: menuItem.name,
                    category: menuItem.category,
                    description: menuItem.description ?? null,
                    available: menuItem.available,
                    sortOrder: menuItem.sortOrder,
                })
                .where(eq(menuItems.id, menuItem.id)),
            (e) => new PersistenceError(e),
        ).map(() => undefined);
    }

    delete(id: string): ResultAsync<void, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.delete(menuItems).where(eq(menuItems.id, id)),
            (e) => new PersistenceError(e),
        ).map(() => undefined);
    }
}
