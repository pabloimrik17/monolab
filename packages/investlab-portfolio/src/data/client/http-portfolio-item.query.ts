import { inject, injectable } from "inversify";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import { portfolioItemListDtoSchema } from "../contracts/portfolio-item-list.dto.ts";
import { instrumentToDomain } from "./instrument.mapper.ts";
import { portfolioItemToDomain } from "./portfolio-item.mapper.ts";
import type { PortfolioRemoteError } from "../../domain/errors.ts";
import type { PortfolioItemListQuery } from "../../domain/ports/portfolio-item-list.query.ts";
import type { PortfolioItemList } from "../../domain/read-models/portfolio-item-list.ts";
import type { ResultAsync } from "neverthrow";

@injectable()
export class HttpPortfolioItemQuery implements PortfolioItemListQuery<PortfolioRemoteError> {
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
