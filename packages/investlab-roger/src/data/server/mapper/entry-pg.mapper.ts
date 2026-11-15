import { Entry } from "#domain/model/entry.model.ts";
import type { rogerEntries } from "#data/server/infra/db/entry.table.ts";
import type { RogerState } from "#domain/value-object/roger-state.value-object.ts";

type EntryRow = typeof rogerEntries.$inferSelect;
type EntryInsert = typeof rogerEntries.$inferInsert;

function numberOrUndefined(value: string | null): number | undefined {
    return value === null ? undefined : Number(value);
}

export function entryToDomain(row: EntryRow): Entry {
    return Entry.reconstitute({
        id: row.id,
        instrumentId: row.instrumentId,
        state: row.state as RogerState,
        entryPrice: Number(row.entryPrice),
        quantity: row.quantity ?? undefined,
        buyCommission: numberOrUndefined(row.buyCommission),
        buyDate: row.buyDate ?? undefined,
        exitPrice: numberOrUndefined(row.exitPrice),
        sellCommission: numberOrUndefined(row.sellCommission),
        sellDate: row.sellDate ?? undefined,
        stateSince: row.stateSince,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    });
}

// Null, not undefined: a transition clears columns, and Drizzle's `set` skips undefined.
export function entryToRow(entry: Entry): EntryInsert {
    return {
        id: entry.id,
        instrumentId: entry.instrumentId,
        state: entry.state,
        entryPrice: entry.entryPrice.toString(),
        quantity: entry.quantity ?? null,
        buyCommission: entry.buyCommission?.toString() ?? null,
        buyDate: entry.buyDate ?? null,
        exitPrice: entry.exitPrice?.toString() ?? null,
        sellCommission: entry.sellCommission?.toString() ?? null,
        sellDate: entry.sellDate ?? null,
        stateSince: entry.stateSince,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
    };
}
