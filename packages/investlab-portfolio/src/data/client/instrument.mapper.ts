import { Instrument } from "../../domain/entities/instrument.ts";
import type { AssetClass } from "../../domain/value-objects/asset-class.ts";
import type { InstrumentType } from "../../domain/value-objects/instrument-type.ts";
import type { Sector } from "../../domain/value-objects/sector.ts";
import type { InstrumentDto } from "../contracts/instrument.dto.ts";

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
