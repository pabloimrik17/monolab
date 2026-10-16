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
import type {
    PortfolioItem,
    PortfolioItemRepository,
    RemotePortError,
} from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

@injectable()
export class HttpPortfolioItemRepository implements PortfolioItemRepository<RemotePortError> {
    constructor(@inject(ApiClient) private readonly api: ApiClient) {}

    save(item: PortfolioItem): ResultAsync<PortfolioItem, RemotePortError> {
        return this.api
            .json("POST", "/portfolio-items", portfolioItemDtoSchema, {
                body: portfolioItemToCreateDto(item),
                resourceId: item.instrumentId,
            })
            .map(portfolioItemToDomain);
    }

    findById(id: string): ResultAsync<PortfolioItem | null, RemotePortError> {
        // The API has no single-item route; the list is the only read model.
        return this.findAll().map((items) => items.find((item) => item.id === id) ?? null);
    }

    findAll(): ResultAsync<PortfolioItem[], RemotePortError> {
        return this.api
            .json("GET", "/portfolio-items", portfolioItemListDtoSchema)
            .map(({ items }) => items.map(({ item }) => portfolioItemToDomain(item)));
    }

    update(
        item: PortfolioItem,
        expectedUpdatedAt: Date,
    ): ResultAsync<PortfolioItem, RemotePortError> {
        return this.api
            .json("PUT", `/portfolio-items/${item.id}`, portfolioItemDtoSchema, {
                body: portfolioItemToUpdateDto(item, expectedUpdatedAt),
                resourceId: item.id,
            })
            .map(portfolioItemToDomain);
    }

    delete(id: string): ResultAsync<void, RemotePortError> {
        return this.api.empty("DELETE", `/portfolio-items/${id}`, { resourceId: id });
    }
}
