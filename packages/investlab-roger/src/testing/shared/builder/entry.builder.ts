import { Entry, type EntryDraft, type EntryValues } from "#domain/model/entry.model.ts";
import { fieldsOf, RogerState } from "#domain/value-object/roger-state.value-object.ts";

const DEFAULT_VALUES: Required<EntryValues> = {
    entryPrice: 150,
    quantity: 10,
    buyCommission: 2,
    buyDate: "2026-10-01",
    exitPrice: 180,
    sellCommission: 2,
    sellDate: "2026-11-01",
};

/** A valid entry in `state` (default `WATCHING`), with defaults for exactly that state's fields. */
export function makeEntry(overrides: Partial<EntryDraft & { instrumentId: string }> = {}): Entry {
    const state = overrides.state ?? RogerState.Watching;
    const defaults = Object.fromEntries(
        fieldsOf(state).map((field) => [field, DEFAULT_VALUES[field]]),
    );
    return Entry.create({
        instrumentId: crypto.randomUUID(),
        ...defaults,
        ...overrides,
        state,
    })._unsafeUnwrap();
}
