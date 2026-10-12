import { asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import {
    PersistenceError,
    type PortfolioItem,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";
import { portfolioItemToDomain, portfolioItemToRow } from "../mappers/portfolio-item.mapper.ts";
import { portfolioItems } from "../schema/portfolio-items.ts";
import { DATA_TOKENS } from "../tokens.ts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

@injectable()
export class PgPortfolioItemRepository implements PortfolioItemRepository {
    constructor(@inject(DATA_TOKENS.DrizzleDb) private readonly db: NodePgDatabase) {}

    save(item: PortfolioItem): ResultAsync<PortfolioItem, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.insert(portfolioItems).values(portfolioItemToRow(item)).returning(),
            (e) => new PersistenceError(e),
        ).map((rows) => portfolioItemToDomain(rows[0]!));
    }

    findById(id: string): ResultAsync<PortfolioItem | null, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(portfolioItems).where(eq(portfolioItems.id, id)),
            (e) => new PersistenceError(e),
        ).map((rows) => (rows.length > 0 ? portfolioItemToDomain(rows[0]!) : null));
    }

    findAll(): ResultAsync<PortfolioItem[], PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(portfolioItems).orderBy(asc(portfolioItems.createdAt)),
            (e) => new PersistenceError(e),
        ).map((rows) => rows.map(portfolioItemToDomain));
    }

    update(item: PortfolioItem): ResultAsync<PortfolioItem, PersistenceError> {
        const row = portfolioItemToRow(item);
        return ResultAsync.fromPromise(
            (async () => {
                const rows = await this.db
                    .update(portfolioItems)
                    .set(row)
                    .where(eq(portfolioItems.id, item.id))
                    .returning();
                if (rows.length === 0) {
                    throw new PersistenceError(`PortfolioItem not found: ${item.id}`);
                }
                return rows;
            })(),
            (e) => new PersistenceError(e),
        ).map((rows) => portfolioItemToDomain(rows[0]!));
    }

    delete(id: string): ResultAsync<void, PersistenceError> {
        return ResultAsync.fromPromise(
            (async () => {
                await this.db.delete(portfolioItems).where(eq(portfolioItems.id, id));
            })(),
            (e) => new PersistenceError(e),
        );
    }
}
