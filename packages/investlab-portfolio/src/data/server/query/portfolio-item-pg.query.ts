import { asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { portfolioItems } from "#data/server/infra/db/portfolio-item.table.ts";
import { portfolioItemToDomain } from "#data/server/mapper/portfolio-item-pg.mapper.ts";
import { instruments, instrumentToDomain } from "@m0n0lab/investlab-catalog/server";
import { PLATFORM, type Db } from "@m0n0lab/investlab-platform/server";
import type { PortfolioItemQuery } from "#domain/query/portfolio-item.query.ts";
import type { PortfolioItemWithInstrument } from "#domain/read-model/portfolio-item-with-instrument.read-model.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

@injectable()
export class PortfolioItemPgQuery implements PortfolioItemQuery {
    constructor(@inject(PLATFORM.Db) private readonly db: Db) {}

    listWithInstruments(): ResultAsync<PortfolioItemWithInstrument[], PersistenceError> {
        return this.db
            .select((tx) =>
                tx
                    .select({ item: portfolioItems, instrument: instruments })
                    .from(portfolioItems)
                    .innerJoin(instruments, eq(portfolioItems.instrumentId, instruments.id))
                    .orderBy(asc(portfolioItems.createdAt)),
            )
            .map((rows) =>
                rows.map((row) => ({
                    item: portfolioItemToDomain(row.item),
                    instrument: instrumentToDomain(row.instrument),
                })),
            );
    }
}
