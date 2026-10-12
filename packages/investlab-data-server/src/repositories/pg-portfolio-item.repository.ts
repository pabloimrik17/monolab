import { asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { err, ok, type ResultAsync } from "neverthrow";
import {
    PersistenceError,
    type PortfolioItem,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";
import { portfolioItemToDomain, portfolioItemToRow } from "../mappers/portfolio-item.mapper.ts";
import { portfolioItems } from "../schema/portfolio-items.ts";
import { DATA_TOKENS } from "../tokens.ts";
import { wrapDb } from "../wrap-db.ts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

@injectable()
export class PgPortfolioItemRepository implements PortfolioItemRepository {
    private readonly db: ReturnType<typeof wrapDb>;

    constructor(@inject(DATA_TOKENS.DrizzleDb) db: NodePgDatabase) {
        this.db = wrapDb(db);
    }

    save(item: PortfolioItem): ResultAsync<PortfolioItem, PersistenceError> {
        return this.db
            .insert((tx) => tx.insert(portfolioItems).values(portfolioItemToRow(item)).returning())
            .map((rows) => portfolioItemToDomain(rows[0]!));
    }

    findById(id: string): ResultAsync<PortfolioItem | null, PersistenceError> {
        return this.db
            .select((tx) => tx.select().from(portfolioItems).where(eq(portfolioItems.id, id)))
            .map((rows) => (rows.length > 0 ? portfolioItemToDomain(rows[0]!) : null));
    }

    findAll(): ResultAsync<PortfolioItem[], PersistenceError> {
        return this.db
            .select((tx) => tx.select().from(portfolioItems).orderBy(asc(portfolioItems.createdAt)))
            .map((rows) => rows.map(portfolioItemToDomain));
    }

    update(item: PortfolioItem): ResultAsync<PortfolioItem, PersistenceError> {
        const row = portfolioItemToRow(item);
        return this.db
            .update((tx) =>
                tx
                    .update(portfolioItems)
                    .set(row)
                    .where(eq(portfolioItems.id, item.id))
                    .returning(),
            )
            .andThen((rows) =>
                rows.length === 0
                    ? err(new PersistenceError(`PortfolioItem not found: ${item.id}`))
                    : ok(portfolioItemToDomain(rows[0]!)),
            );
    }

    delete(id: string): ResultAsync<void, PersistenceError> {
        return this.db
            .delete((tx) => tx.delete(portfolioItems).where(eq(portfolioItems.id, id)))
            .map(() => undefined);
    }
}
