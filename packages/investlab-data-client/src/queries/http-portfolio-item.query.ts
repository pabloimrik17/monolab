// fallow-ignore-file unused-class-member -- port impl bound in DI, consumed by application-client use cases (task 11.2)
import { inject, injectable } from "inversify";
import { portfolioItemListDtoSchema } from "@m0n0lab/investlab-data-contracts";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import { instrumentToDomain } from "../mappers/instrument.mapper.ts";
import { portfolioItemToDomain } from "../mappers/portfolio-item.mapper.ts";
import type {
    PortfolioItemList,
    PortfolioItemListQuery,
    PortfolioRemoteError,
} from "@m0n0lab/investlab-domain";
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
