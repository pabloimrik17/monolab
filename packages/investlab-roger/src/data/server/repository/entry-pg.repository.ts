import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { err, ok, type ResultAsync } from "neverthrow";
import { rogerEntries } from "#data/server/infra/db/entry.table.ts";
import { entryToDomain, entryToRow } from "#data/server/mapper/entry-pg.mapper.ts";
import { EntryConflictError } from "#domain/error/entry.error.ts";
import { InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import { type PersistenceError } from "@m0n0lab/investlab-core";
import {
    FOREIGN_KEY_VIOLATION,
    PLATFORM,
    violates,
    type Db,
} from "@m0n0lab/investlab-platform/server";
import type { Entry } from "#domain/model/entry.model.ts";
import type { EntryRepository } from "#domain/repository/entry.repository.ts";

@injectable()
export class EntryPgRepository implements EntryRepository {
    constructor(@inject(PLATFORM.Db) private readonly db: Db) {}

    save(entry: Entry): ResultAsync<Entry, PersistenceError | InstrumentNotFoundError> {
        return this.db
            .insert((tx) => tx.insert(rogerEntries).values(entryToRow(entry)).returning())
            .map((rows) => entryToDomain(rows[0]!))
            .mapErr((error) =>
                violates(error, FOREIGN_KEY_VIOLATION)
                    ? new InstrumentNotFoundError(entry.instrumentId)
                    : error,
            );
    }

    findById(id: string): ResultAsync<Entry | null, PersistenceError> {
        return this.db
            .select((tx) => tx.select().from(rogerEntries).where(eq(rogerEntries.id, id)))
            .map((rows) => (rows.length > 0 ? entryToDomain(rows[0]!) : null));
    }

    update(
        entry: Entry,
        expectedUpdatedAt: Date,
    ): ResultAsync<Entry, PersistenceError | EntryConflictError> {
        return this.db
            .update((tx) =>
                tx
                    .update(rogerEntries)
                    .set(entryToRow(entry))
                    .where(
                        and(
                            eq(rogerEntries.id, entry.id),
                            eq(rogerEntries.updatedAt, expectedUpdatedAt),
                        ),
                    )
                    .returning(),
            )
            .andThen((rows) =>
                rows.length === 0
                    ? err(new EntryConflictError(entry.id))
                    : ok(entryToDomain(rows[0]!)),
            );
    }

    delete(id: string): ResultAsync<void, PersistenceError> {
        return this.db
            .delete((tx) => tx.delete(rogerEntries).where(eq(rogerEntries.id, id)))
            .map(() => undefined);
    }
}
