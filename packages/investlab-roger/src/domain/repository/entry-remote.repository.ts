import type { RogerRemoteError } from "#domain/error/roger-remote.error.ts";
import type { Entry, EntryDraft, EntryValues } from "#domain/model/entry.model.ts";
import type { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import type { Sector } from "@m0n0lab/investlab-catalog";
import type { ResultAsync } from "neverthrow";

/** What the web last read of an entry; an `Entry` fits. */
export interface EntryRef {
    id: string;
    state: RogerState;
    updatedAt: Date;
}

export interface NewInstrument {
    symbol: string;
    name: string;
    sector?: Sector | undefined;
}

/** A draft for an existing instrument or for a new stock, never both. */
export type EntryCreateInput = EntryDraft &
    ({ instrumentId: string } | { newInstrument: NewInstrument });

/** The API has one route per action, so the client port has one method per route. */
export interface EntryRemoteRepository {
    create(input: EntryCreateInput): ResultAsync<Entry, RogerRemoteError>;
    edit(current: EntryRef, values: EntryValues): ResultAsync<Entry, RogerRemoteError>;
    transition(
        current: EntryRef,
        to: RogerState,
        values: EntryValues,
    ): ResultAsync<Entry, RogerRemoteError>;
    reEnter(
        current: Pick<EntryRef, "id" | "state">,
        values: Pick<EntryValues, "entryPrice" | "quantity">,
    ): ResultAsync<Entry, RogerRemoteError>;
    delete(id: string): ResultAsync<void, RogerRemoteError>;
}
