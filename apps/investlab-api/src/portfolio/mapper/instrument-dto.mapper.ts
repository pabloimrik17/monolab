import type { Instrument, InstrumentDto } from "@m0n0lab/investlab-portfolio";

export function toInstrumentDto(instrument: Instrument): InstrumentDto {
    return {
        id: instrument.id,
        symbol: instrument.symbol,
        name: instrument.name,
        type: instrument.type,
        assetClass: instrument.assetClass,
        ...(instrument.exchange != null && { exchange: instrument.exchange }),
        ...(instrument.sector != null && { sector: instrument.sector }),
        ...(instrument.replicates != null && { replicates: instrument.replicates }),
        quotable: instrument.quotable,
    };
}
