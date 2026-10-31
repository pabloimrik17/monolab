import { inject, injectable } from "inversify";
import { instrumentToDomain } from "#data/client/mapper/instrument-dto.mapper.ts";
import { portfolioItemToDomain } from "#data/client/mapper/portfolio-item-dto.mapper.ts";
import { portfolioItemListDtoSchema } from "#data/shared/dto/portfolio-item-list.dto.ts";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import type { PortfolioRemoteError } from "#domain/error/portfolio-remote.error.ts";
import type { PortfolioItemListQuery } from "#domain/query/portfolio-item-list.query.ts";
import type { PortfolioItemList } from "#domain/read-model/portfolio-item-list.read-model.ts";
import type { ResultAsync } from "neverthrow";

@injectable()
export class PortfolioItemListApiQuery implements PortfolioItemListQuery<PortfolioRemoteError> {
    constructor(@inject(PLATFORM.InvestlabApiClient) private readonly api: InvestlabApiClient) {}

    list(): ResultAsync<PortfolioItemList, PortfolioRemoteError> {
        return this.api
            .json("GET", "/portfolio-items", portfolioItemListDtoSchema)
            .map(({ items, instruments }) => ({
                items: items.map(({ item, instrument }) => ({
                    item: portfolioItemToDomain(item),
                    instrument: instrumentToDomain(instrument),
                })),
                instruments: instruments.map(instrumentToDomain),
            }));
    }
}
