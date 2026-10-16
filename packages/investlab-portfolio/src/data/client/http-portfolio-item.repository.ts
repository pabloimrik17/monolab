import { inject, injectable } from "inversify";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import {
    InstrumentNotFoundError,
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
    type PortfolioRemoteError,
} from "../../domain/errors.ts";
import { portfolioItemListDtoSchema } from "../contracts/portfolio-item-list.dto.ts";
import { portfolioItemDtoSchema } from "../contracts/portfolio-item.dto.ts";
import {
    portfolioItemToCreateDto,
    portfolioItemToDomain,
    portfolioItemToUpdateDto,
} from "./portfolio-item.mapper.ts";
import type { PortfolioItem } from "../../domain/entities/portfolio-item.ts";
import type { PortfolioItemRepository } from "../../domain/ports/portfolio-item.repository.ts";
import type { ResultAsync } from "neverthrow";

@injectable()
export class HttpPortfolioItemRepository implements PortfolioItemRepository<PortfolioRemoteError> {
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
