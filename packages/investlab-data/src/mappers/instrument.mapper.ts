import { AssetClass, Instrument, InstrumentType, type Sector } from "@m0n0lab/investlab-domain";
import type { instruments } from "../schema/instruments.ts";

type InstrumentRow = typeof instruments.$inferSelect;
type InstrumentInsert = typeof instruments.$inferInsert;

export function instrumentToDomain(row: InstrumentRow): Instrument {
    return Instrument.reconstitute({
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        type: row.type as InstrumentType,
        assetClass: row.assetClass as AssetClass,
        exchange: row.exchange ?? undefined,
        sector: (row.sector as Sector) ?? undefined,
        replicates: row.replicates ?? undefined,
        quotable: row.quotable,
    });
}

export function instrumentToRow(instrument: Instrument): InstrumentInsert {
    return {
        id: instrument.id,
        symbol: instrument.symbol,
        name: instrument.name,
        type: instrument.type,
        assetClass: instrument.assetClass,
        exchange: instrument.exchange ?? null,
        sector: instrument.sector ?? null,
        replicates: instrument.replicates ?? null,
        quotable: instrument.quotable,
    };
}
