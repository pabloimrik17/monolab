import type { Entry, EntryDto, EntryListDto, EntryWithInstrument } from "@m0n0lab/investlab-roger";

export function toEntryDto(entry: Entry): EntryDto {
    return {
        id: entry.id,
        instrumentId: entry.instrumentId,
        state: entry.state,
        entryPrice: entry.entryPrice,
        ...(entry.quantity !== undefined && { quantity: entry.quantity }),
        ...(entry.buyCommission !== undefined && { buyCommission: entry.buyCommission }),
        ...(entry.buyDate !== undefined && { buyDate: entry.buyDate }),
        ...(entry.exitPrice !== undefined && { exitPrice: entry.exitPrice }),
        ...(entry.sellCommission !== undefined && { sellCommission: entry.sellCommission }),
        ...(entry.sellDate !== undefined && { sellDate: entry.sellDate }),
        stateSince: entry.stateSince.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
    };
}

export function toEntryListDto(rows: readonly EntryWithInstrument[]): EntryListDto {
    return rows.map(({ entry, instrument }) => ({
        entry: toEntryDto(entry),
        instrument: {
            symbol: instrument.symbol,
            name: instrument.name,
            ...(instrument.sector !== undefined && { sector: instrument.sector }),
        },
    }));
}
