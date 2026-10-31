import type { InstrumentCreateUseCase } from "#application/client/use-case/instrument-create.use-case.ts";
import type { InstrumentDeleteUseCase } from "#application/client/use-case/instrument-delete.use-case.ts";
import type { InstrumentListUseCase } from "#application/client/use-case/instrument-list.use-case.ts";
import type { InstrumentUpdateUseCase } from "#application/client/use-case/instrument-update.use-case.ts";
import type { PortfolioItemCreateUseCase } from "#application/client/use-case/portfolio-item-create.use-case.ts";
import type { PortfolioItemDeleteUseCase } from "#application/client/use-case/portfolio-item-delete.use-case.ts";
import type { PortfolioItemListUseCase } from "#application/client/use-case/portfolio-item-list.use-case.ts";
import type { PortfolioItemUpdateUseCase } from "#application/client/use-case/portfolio-item-update.use-case.ts";
import type { PortfolioRemoteError } from "#domain/error/portfolio-remote.error.ts";
import type { PortfolioItemListQuery } from "#domain/query/portfolio-item-list.query.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { PortfolioItemRepository } from "#domain/repository/portfolio-item.repository.ts";
import type { ServiceIdentifier } from "inversify";

/** Client use cases of the portfolio module. */
export const PORTFOLIO = {
    ItemCreate: Symbol.for(
        "investlab.portfolio.client.ItemCreate",
    ) as ServiceIdentifier<PortfolioItemCreateUseCase>,
    ItemUpdate: Symbol.for(
        "investlab.portfolio.client.ItemUpdate",
    ) as ServiceIdentifier<PortfolioItemUpdateUseCase>,
    ItemDelete: Symbol.for(
        "investlab.portfolio.client.ItemDelete",
    ) as ServiceIdentifier<PortfolioItemDeleteUseCase>,
    ItemList: Symbol.for(
        "investlab.portfolio.client.ItemList",
    ) as ServiceIdentifier<PortfolioItemListUseCase>,
    InstrumentList: Symbol.for(
        "investlab.portfolio.client.InstrumentList",
    ) as ServiceIdentifier<InstrumentListUseCase>,
    InstrumentCreate: Symbol.for(
        "investlab.portfolio.client.InstrumentCreate",
    ) as ServiceIdentifier<InstrumentCreateUseCase>,
    InstrumentUpdate: Symbol.for(
        "investlab.portfolio.client.InstrumentUpdate",
    ) as ServiceIdentifier<InstrumentUpdateUseCase>,
    InstrumentDelete: Symbol.for(
        "investlab.portfolio.client.InstrumentDelete",
    ) as ServiceIdentifier<InstrumentDeleteUseCase>,
} as const;

/** Ports the client use cases depend on; bound by `di/client.module.ts`, never exported. */
export const PORTFOLIO_PORTS = {
    InstrumentRepository: Symbol.for(
        "investlab.portfolio.client.InstrumentRepository",
    ) as ServiceIdentifier<InstrumentRepository<PortfolioRemoteError>>,
    PortfolioItemRepository: Symbol.for(
        "investlab.portfolio.client.PortfolioItemRepository",
    ) as ServiceIdentifier<PortfolioItemRepository<PortfolioRemoteError>>,
    PortfolioItemListQuery: Symbol.for(
        "investlab.portfolio.client.PortfolioItemListQuery",
    ) as ServiceIdentifier<PortfolioItemListQuery<PortfolioRemoteError>>,
} as const;
