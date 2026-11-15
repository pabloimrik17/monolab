import { Entry } from "#domain/model/entry.model.ts";
import type { EntryDto, EntryWithInstrumentDto } from "#data/shared/dto/entry.dto.ts";
import type { EntryWithInstrument } from "#domain/read-model/entry-with-instrument.read-model.ts";
import type { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import type { Sector } from "@m0n0lab/investlab-catalog";

export function entryToDomain(dto: EntryDto): Entry {
    return Entry.reconstitute({
        id: dto.id,
        instrumentId: dto.instrumentId,
        state: dto.state as RogerState,
        entryPrice: dto.entryPrice,
        quantity: dto.quantity,
        buyCommission: dto.buyCommission,
        buyDate: dto.buyDate,
        exitPrice: dto.exitPrice,
        sellCommission: dto.sellCommission,
        sellDate: dto.sellDate,
        stateSince: new Date(dto.stateSince),
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
    });
}

export function entryWithInstrumentToDomain({
    entry,
    instrument,
}: EntryWithInstrumentDto): EntryWithInstrument {
    return {
        entry: entryToDomain(entry),
        instrument: {
            symbol: instrument.symbol,
            name: instrument.name,
            sector: instrument.sector as Sector | undefined,
        },
    };
}
