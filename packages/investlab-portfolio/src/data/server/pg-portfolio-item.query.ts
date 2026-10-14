import { asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PLATFORM, type Db } from "@m0n0lab/investlab-platform/server";
import { instrumentToDomain } from "./instrument.mapper.ts";
import { portfolioItemToDomain } from "./portfolio-item.mapper.ts";
import { instruments, portfolioItems } from "./schema.ts";
import type { PortfolioItemQuery } from "../../domain/ports/portfolio-item.query.ts";
import type { PortfolioItemWithInstrument } from "../../domain/read-models/portfolio-item-with-instrument.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
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
