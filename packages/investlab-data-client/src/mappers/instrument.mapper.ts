import {
    Instrument,
    type AssetClass,
    type InstrumentType,
    type Sector,
} from "@m0n0lab/investlab-domain";
import type { InstrumentDto } from "@m0n0lab/investlab-data-contracts";

export function instrumentToDomain(dto: InstrumentDto): Instrument {
    return Instrument.reconstitute({
        id: dto.id,
        symbol: dto.symbol,
        name: dto.name,
        type: dto.type as InstrumentType,
        assetClass: dto.assetClass as AssetClass,
        exchange: dto.exchange,
        sector: dto.sector as Sector | undefined,
        replicates: dto.replicates,
        quotable: dto.quotable,
    });
}
