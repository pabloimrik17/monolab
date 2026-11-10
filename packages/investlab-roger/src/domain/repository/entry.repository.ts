import type { EntryConflictError } from "#domain/error/entry.error.ts";
import type { Entry } from "#domain/model/entry.model.ts";
import type { InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export interface EntryRepository<E extends Error = PersistenceError> {
    /** Fails with `InstrumentNotFoundError` when the entry names an instrument the catalog lacks. */
    save(entry: Entry): ResultAsync<Entry, E | InstrumentNotFoundError>;
    findById(id: string): ResultAsync<Entry | null, E>;
    /** Optimistic lock: fails with a conflict unless the stored row still carries `expectedUpdatedAt`. */
    update(entry: Entry, expectedUpdatedAt: Date): ResultAsync<Entry, E | EntryConflictError>;
    delete(id: string): ResultAsync<void, E>;
}
