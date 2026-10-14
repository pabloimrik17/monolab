import { Instrument } from "../../domain/entities/instrument.ts";
import type { AssetClass } from "../../domain/value-objects/asset-class.ts";
import type { InstrumentType } from "../../domain/value-objects/instrument-type.ts";
import type { Sector } from "../../domain/value-objects/sector.ts";
import type {
    CreateInstrumentDto,
    InstrumentDto,
    UpdateInstrumentDto,
} from "../contracts/instrument.dto.ts";

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

export function instrumentToCreateDto(instrument: Instrument): CreateInstrumentDto {
    return {
        symbol: instrument.symbol,
        name: instrument.name,
        type: instrument.type,
        assetClass: instrument.assetClass,
        ...(instrument.exchange !== undefined && { exchange: instrument.exchange }),
        ...(instrument.sector !== undefined && { sector: instrument.sector }),
        ...(instrument.replicates !== undefined && { replicates: instrument.replicates }),
        quotable: instrument.quotable,
    };
}

/** `null` is how the wire says "clear it"; an entity without the field always clears. */
export function instrumentToUpdateDto(instrument: Instrument): UpdateInstrumentDto {
    return {
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
