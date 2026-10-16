import type { PortfolioRemoteError } from "../../domain/errors.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { PortfolioItemListQuery } from "../../domain/ports/portfolio-item-list.query.ts";
import type { PortfolioItemRepository } from "../../domain/ports/portfolio-item.repository.ts";
import type { InstrumentCreateUseCase } from "./instrument-create.use-case.ts";
import type { InstrumentDeleteUseCase } from "./instrument-delete.use-case.ts";
import type { InstrumentListUseCase } from "./instrument-list.use-case.ts";
import type { InstrumentUpdateUseCase } from "./instrument-update.use-case.ts";
import type { PortfolioItemCreateUseCase } from "./portfolio-item-create.use-case.ts";
import type { PortfolioItemDeleteUseCase } from "./portfolio-item-delete.use-case.ts";
import type { PortfolioItemListUseCase } from "./portfolio-item-list.use-case.ts";
import type { PortfolioItemUpdateUseCase } from "./portfolio-item-update.use-case.ts";
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

/** Ports the client use cases depend on; bound by `module.client.ts`, never exported. */
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
