import { inject, injectable } from "inversify";
import {
    TOKENS,
    type PortfolioItemList,
    type PortfolioItemListQuery,
    type RemotePortError,
} from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

export type { PortfolioItemList };

export type PortfolioItemListError = RemotePortError;

@injectable()
export class PortfolioItemListUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemListQuery)
        private readonly portfolioItemListQuery: PortfolioItemListQuery<RemotePortError>,
    ) {}

    // `/portfolio-items` already carries the catalog, so one request serves both.
    execute(): ResultAsync<PortfolioItemList, PortfolioItemListError> {
        return this.portfolioItemListQuery.list();
    }
}
