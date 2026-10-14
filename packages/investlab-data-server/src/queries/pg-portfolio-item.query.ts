import { asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PLATFORM, type Db } from "@m0n0lab/investlab-platform/server";
import { instrumentToDomain } from "../mappers/instrument.mapper.ts";
import { portfolioItemToDomain } from "../mappers/portfolio-item.mapper.ts";
import { instruments } from "../schema/instruments.ts";
import { portfolioItems } from "../schema/portfolio-items.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { PortfolioItemQuery, PortfolioItemWithInstrument } from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

@injectable()
export class PgPortfolioItemQuery implements PortfolioItemQuery {
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
