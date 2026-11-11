import { inject, injectable } from "inversify";
import {
    portfolioItemToCreateDto,
    portfolioItemToDomain,
    portfolioItemToUpdateDto,
} from "#data/client/mapper/portfolio-item-dto.mapper.ts";
import { portfolioItemListDtoSchema } from "#data/shared/dto/portfolio-item-list.dto.ts";
import { portfolioItemDtoSchema } from "#data/shared/dto/portfolio-item.dto.ts";
import {
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
} from "#domain/error/portfolio-item.error.ts";
import { type PortfolioRemoteError } from "#domain/error/portfolio-remote.error.ts";
import { InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import type { PortfolioItem } from "#domain/model/portfolio-item.model.ts";
import type { PortfolioItemRepository } from "#domain/repository/portfolio-item.repository.ts";
import type { ResultAsync } from "neverthrow";

@injectable()
export class PortfolioItemApiRepository implements PortfolioItemRepository<PortfolioRemoteError> {
    constructor(@inject(PLATFORM.InvestlabApiClient) private readonly api: InvestlabApiClient) {}

    save(item: PortfolioItem): ResultAsync<PortfolioItem, PortfolioRemoteError> {
        return this.api
            .json("POST", "/portfolio-items", portfolioItemDtoSchema, {
                body: portfolioItemToCreateDto(item),
                errors: {
                    INSTRUMENT_NOT_FOUND: () => new InstrumentNotFoundError(item.instrumentId),
                },
            })
            .map(portfolioItemToDomain);
    }

    findById(id: string): ResultAsync<PortfolioItem | null, PortfolioRemoteError> {
        // The API has no single-item route; the list is the only read model.
        return this.findAll().map((items) => items.find((item) => item.id === id) ?? null);
    }

    findAll(): ResultAsync<PortfolioItem[], PortfolioRemoteError> {
        return this.api
            .json("GET", "/portfolio-items", portfolioItemListDtoSchema)
            .map(({ items }) => items.map(({ item }) => portfolioItemToDomain(item)));
    }

    update(
        item: PortfolioItem,
        expectedUpdatedAt: Date,
    ): ResultAsync<PortfolioItem, PortfolioRemoteError> {
        return this.api
            .json<typeof portfolioItemDtoSchema, PortfolioRemoteError>(
                "PUT",
                `/portfolio-items/${item.id}`,
                portfolioItemDtoSchema,
                {
                    body: portfolioItemToUpdateDto(item, expectedUpdatedAt),
                    errors: {
                        PORTFOLIO_ITEM_NOT_FOUND: () => new PortfolioItemNotFoundError(item.id),
                        PORTFOLIO_ITEM_CONFLICT: () => new PortfolioItemConflictError(item.id),
                    },
                },
            )
            .map(portfolioItemToDomain);
    }

    delete(id: string): ResultAsync<void, PortfolioRemoteError> {
        return this.api.empty("DELETE", `/portfolio-items/${id}`, {
            errors: { PORTFOLIO_ITEM_NOT_FOUND: () => new PortfolioItemNotFoundError(id) },
        });
    }
}
