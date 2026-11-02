import { and, asc, eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { err, ok, type ResultAsync } from "neverthrow";
import { portfolioItems } from "#data/server/infra/db/portfolio-item.table.ts";
import {
    portfolioItemToDomain,
    portfolioItemToRow,
} from "#data/server/mapper/portfolio-item-pg.mapper.ts";
import { PortfolioItemConflictError } from "#domain/error/portfolio-item.error.ts";
import { type PersistenceError } from "@m0n0lab/investlab-core";
import { PLATFORM, type Db } from "@m0n0lab/investlab-platform/server";
import type { PortfolioItem } from "#domain/model/portfolio-item.model.ts";
import type { PortfolioItemRepository } from "#domain/repository/portfolio-item.repository.ts";

@injectable()
export class PortfolioItemPgRepository implements PortfolioItemRepository {
    constructor(@inject(PLATFORM.Db) private readonly db: Db) {}

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

    update(
        item: PortfolioItem,
        expectedUpdatedAt: Date,
    ): ResultAsync<PortfolioItem, PersistenceError | PortfolioItemConflictError> {
        const row = portfolioItemToRow(item);
        return this.db
            .update((tx) =>
                tx
                    .update(portfolioItems)
                    .set(row)
                    .where(
                        and(
                            eq(portfolioItems.id, item.id),
                            // defaultNow() stores microseconds; JS Dates carry milliseconds.
                            sql`date_trunc('milliseconds', ${portfolioItems.updatedAt}) = ${expectedUpdatedAt.toISOString()}::timestamptz`,
                        ),
                    )
                    .returning(),
            )
            .andThen((rows) =>
                rows.length === 0
                    ? err(new PortfolioItemConflictError(item.id))
                    : ok(portfolioItemToDomain(rows[0]!)),
            );
    }

    delete(id: string): ResultAsync<void, PersistenceError> {
        return this.db
            .delete((tx) => tx.delete(portfolioItems).where(eq(portfolioItems.id, id)))
            .map(() => undefined);
    }

    existsForInstrument(instrumentId: string): ResultAsync<boolean, PersistenceError> {
        return this.db
            .select((tx) =>
                tx
                    .select({ id: portfolioItems.id })
                    .from(portfolioItems)
                    .where(eq(portfolioItems.instrumentId, instrumentId))
                    .limit(1),
            )
            .map((rows) => rows.length > 0);
    }
}
