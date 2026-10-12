import { inject, injectable } from "inversify";
import {
    portfolioItemDtoSchema,
    portfolioItemListDtoSchema,
} from "@m0n0lab/investlab-data-contracts";
import { ApiClient } from "../api-client.ts";
import {
    portfolioItemToCreateDto,
    portfolioItemToDomain,
    portfolioItemToUpdateDto,
} from "../mappers/portfolio-item.mapper.ts";
import type { ApiClientError } from "../api-client-error.ts";
import type { PortfolioItem, PortfolioItemRepository } from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

@injectable()
export class HttpPortfolioItemRepository implements PortfolioItemRepository<ApiClientError> {
    constructor(@inject(ApiClient) private readonly api: ApiClient) {}

    save(item: PortfolioItem): ResultAsync<PortfolioItem, ApiClientError> {
        return this.api
            .json("POST", "/portfolio-items", portfolioItemDtoSchema, {
                body: portfolioItemToCreateDto(item),
                resourceId: item.instrumentId,
            })
            .map(portfolioItemToDomain);
    }

    findById(id: string): ResultAsync<PortfolioItem | null, ApiClientError> {
        // The API has no single-item route; the list is the only read model.
        return this.findAll().map((items) => items.find((item) => item.id === id) ?? null);
    }

    findAll(): ResultAsync<PortfolioItem[], ApiClientError> {
        return this.api
            .json("GET", "/portfolio-items", portfolioItemListDtoSchema)
            .map(({ items }) => items.map(({ item }) => portfolioItemToDomain(item)));
    }

    update(item: PortfolioItem): ResultAsync<PortfolioItem, ApiClientError> {
        return this.api
            .json("PUT", `/portfolio-items/${item.id}`, portfolioItemDtoSchema, {
                body: portfolioItemToUpdateDto(item),
                resourceId: item.id,
            })
            .map(portfolioItemToDomain);
    }

    delete(id: string): ResultAsync<void, ApiClientError> {
        return this.api.empty("DELETE", `/portfolio-items/${id}`, { resourceId: id });
    }
}
