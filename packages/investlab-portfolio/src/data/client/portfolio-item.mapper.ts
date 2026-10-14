import { PortfolioItem } from "../../domain/entities/portfolio-item.ts";
import type {
    CreatePortfolioItemDto,
    PortfolioItemDto,
    UpdatePortfolioItemDto,
} from "../contracts/portfolio-item.dto.ts";

export function portfolioItemToDomain(dto: PortfolioItemDto): PortfolioItem {
    return PortfolioItem.reconstitute({
        id: dto.id,
        instrumentId: dto.instrumentId,
        broker: dto.broker,
        targetWeight: dto.targetWeight,
        currentValue: dto.currentValue,
        notes: dto.notes,
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
    });
}

export function portfolioItemToCreateDto(item: PortfolioItem): CreatePortfolioItemDto {
    return {
        instrumentId: item.instrumentId,
        broker: item.broker,
        targetWeight: item.targetWeight,
        currentValue: item.currentValue,
        ...(item.notes !== undefined && { notes: item.notes }),
    };
}

/** `notes: null` is how the wire says "clear them"; an entity without notes always clears. */
export function portfolioItemToUpdateDto(
    item: PortfolioItem,
    expectedUpdatedAt: Date,
): UpdatePortfolioItemDto {
    return {
        broker: item.broker,
        targetWeight: item.targetWeight,
        currentValue: item.currentValue,
        notes: item.notes ?? null,
        expectedUpdatedAt: expectedUpdatedAt.toISOString(),
    };
}
