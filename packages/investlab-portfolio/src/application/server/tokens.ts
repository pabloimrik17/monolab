import type { PortfolioItemCreateUseCase } from "#application/server/use-case/portfolio-item-create.use-case.ts";
import type { PortfolioItemDeleteUseCase } from "#application/server/use-case/portfolio-item-delete.use-case.ts";
import type { PortfolioItemListUseCase } from "#application/server/use-case/portfolio-item-list.use-case.ts";
import type { PortfolioItemUpdateUseCase } from "#application/server/use-case/portfolio-item-update.use-case.ts";
import type { PortfolioItemQuery } from "#domain/query/portfolio-item.query.ts";
import type { PortfolioItemRepository } from "#domain/repository/portfolio-item.repository.ts";
import type { ServiceIdentifier } from "inversify";

/** Server use cases of the portfolio module. */
export const PORTFOLIO = {
    ItemCreate: Symbol.for(
        "investlab.portfolio.server.ItemCreate",
    ) as ServiceIdentifier<PortfolioItemCreateUseCase>,
    ItemUpdate: Symbol.for(
        "investlab.portfolio.server.ItemUpdate",
    ) as ServiceIdentifier<PortfolioItemUpdateUseCase>,
    ItemDelete: Symbol.for(
        "investlab.portfolio.server.ItemDelete",
    ) as ServiceIdentifier<PortfolioItemDeleteUseCase>,
    ItemList: Symbol.for(
        "investlab.portfolio.server.ItemList",
    ) as ServiceIdentifier<PortfolioItemListUseCase>,
} as const;

/** Bound by `di/server.module.ts`; never exported from the package. */
export const PORTFOLIO_PORTS = {
    PortfolioItemRepository: Symbol.for(
        "investlab.portfolio.server.PortfolioItemRepository",
    ) as ServiceIdentifier<PortfolioItemRepository>,
    PortfolioItemQuery: Symbol.for(
        "investlab.portfolio.server.PortfolioItemQuery",
    ) as ServiceIdentifier<PortfolioItemQuery>,
} as const;
