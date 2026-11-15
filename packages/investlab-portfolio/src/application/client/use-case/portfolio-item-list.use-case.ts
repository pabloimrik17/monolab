import { inject, injectable } from "inversify";
import { PORTFOLIO_PORTS } from "#application/client/tokens.ts";
import type { PortfolioRemoteError } from "#domain/error/portfolio-remote.error.ts";
import type { PortfolioItemListQuery } from "#domain/query/portfolio-item-list.query.ts";
import type { PortfolioItemList } from "#domain/read-model/portfolio-item-list.read-model.ts";
import type { ResultAsync } from "neverthrow";

export type { PortfolioItemList };

export type PortfolioItemListError = PortfolioRemoteError;

@injectable()
export class PortfolioItemListUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.PortfolioItemListQuery)
        private readonly portfolioItemListQuery: PortfolioItemListQuery<PortfolioRemoteError>,
    ) {}

    // `/portfolio-items` already carries the catalog, so one request serves both.
    execute(): ResultAsync<PortfolioItemList, PortfolioItemListError> {
        return this.portfolioItemListQuery.list();
    }
}
