import type { PortfolioItemList } from "@m0n0lab/investlab-application-server";
import type {
    InstrumentDto,
    PortfolioItemDto,
    PortfolioItemListDto,
} from "@m0n0lab/investlab-data-contracts";
import type { Instrument, PortfolioItem } from "@m0n0lab/investlab-domain";

export function toPortfolioItemDto(item: PortfolioItem): PortfolioItemDto {
    return {
        id: item.id,
        instrumentId: item.instrumentId,
        broker: item.broker,
        targetWeight: item.targetWeight,
        currentValue: item.currentValue,
        ...(item.notes != null && { notes: item.notes }),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
    };
}

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

export function toPortfolioItemListDto({
    items,
    instruments,
}: PortfolioItemList): PortfolioItemListDto {
    return {
        items: items.map(({ item, instrument }) => ({
            item: toPortfolioItemDto(item),
            instrument: toInstrumentDto(instrument),
        })),
        instruments: instruments.map(toInstrumentDto),
    };
}
