import type { EntryWithInstrument } from "#domain/read-model/entry-with-instrument.read-model.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export type EntryListView = "active" | "history";

export interface EntryListQuery<E extends Error = PersistenceError> {
    /** `active`: every state but `SOLD`, by symbol then creation. `history`: `SOLD`, latest sell date first. */
    list(view: EntryListView): ResultAsync<EntryWithInstrument[], E>;
}
