import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import { PORTFOLIO_PORTS } from "#application/server/tokens.ts";
import { CATALOG, type InstrumentListUseCase } from "@m0n0lab/investlab-catalog/server";
import type { PortfolioItemQuery } from "#domain/query/portfolio-item.query.ts";
import type { PortfolioItemList } from "#domain/read-model/portfolio-item-list.read-model.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";

export type { PortfolioItemList };

export type PortfolioItemListError = PersistenceError;

@injectable()
export class PortfolioItemListUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.PortfolioItemQuery)
        private readonly portfolioItemQuery: PortfolioItemQuery,
        @inject(CATALOG.InstrumentList)
        private readonly instrumentList: InstrumentListUseCase,
    ) {}

    execute(): ResultAsync<PortfolioItemList, PortfolioItemListError> {
        return ResultAsync.combine([
            this.portfolioItemQuery.listWithInstruments(),
            this.instrumentList.execute(),
        ] as const).map(([items, instruments]) => ({ items, instruments }));
    }
}
