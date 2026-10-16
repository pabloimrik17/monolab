import { Instrument } from "../../domain/entities/instrument.ts";
import type { AssetClass } from "../../domain/value-objects/asset-class.ts";
import type { InstrumentType } from "../../domain/value-objects/instrument-type.ts";
import type { Sector } from "../../domain/value-objects/sector.ts";
import type { instruments } from "./schema.ts";

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
