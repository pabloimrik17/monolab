import { asc, desc, eq, ne } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { rogerEntries } from "#data/server/infra/db/entry.table.ts";
import { entryToDomain } from "#data/server/mapper/entry-pg.mapper.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { instruments } from "@m0n0lab/investlab-catalog/server";
import { PLATFORM, type Db } from "@m0n0lab/investlab-platform/server";
import type { EntryListQuery, EntryListView } from "#domain/query/entry-list.query.ts";
import type { EntryWithInstrument } from "#domain/read-model/entry-with-instrument.read-model.ts";
import type { Sector } from "@m0n0lab/investlab-catalog";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

const VIEWS = {
    active: {
        where: ne(rogerEntries.state, RogerState.Sold),
        orderBy: [asc(instruments.symbol), asc(rogerEntries.createdAt)],
    },
    history: {
        where: eq(rogerEntries.state, RogerState.Sold),
        orderBy: [desc(rogerEntries.sellDate)],
    },
};

@injectable()
export class EntryPgQuery implements EntryListQuery {
    constructor(@inject(PLATFORM.Db) private readonly db: Db) {}

    list(view: EntryListView): ResultAsync<EntryWithInstrument[], PersistenceError> {
        const { where, orderBy } = VIEWS[view];
        return this.db
            .select((tx) =>
                tx
                    .select({
                        entry: rogerEntries,
                        symbol: instruments.symbol,
                        name: instruments.name,
                        sector: instruments.sector,
                    })
                    .from(rogerEntries)
                    .innerJoin(instruments, eq(rogerEntries.instrumentId, instruments.id))
                    .where(where)
                    .orderBy(...orderBy),
            )
            .map((rows) =>
                rows.map(({ entry, symbol, name, sector }) => ({
                    entry: entryToDomain(entry),
                    instrument: { symbol, name, sector: (sector as Sector | null) ?? undefined },
                })),
            );
    }
}
