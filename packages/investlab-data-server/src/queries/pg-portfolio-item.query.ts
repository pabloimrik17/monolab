import { asc, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { instrumentToDomain } from "../mappers/instrument.mapper.ts";
import { portfolioItemToDomain } from "../mappers/portfolio-item.mapper.ts";
import { instruments } from "../schema/instruments.ts";
import { portfolioItems } from "../schema/portfolio-items.ts";
import { DATA_TOKENS } from "../tokens.ts";
import { wrapDb } from "../wrap-db.ts";
import type {
    PersistenceError,
    PortfolioItemQuery,
    PortfolioItemWithInstrument,
} from "@m0n0lab/investlab-domain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ResultAsync } from "neverthrow";

@injectable()
export class PgPortfolioItemQuery implements PortfolioItemQuery {
    private readonly db: ReturnType<typeof wrapDb>;

    constructor(@inject(DATA_TOKENS.DrizzleDb) db: NodePgDatabase) {
        this.db = wrapDb(db);
    }

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
