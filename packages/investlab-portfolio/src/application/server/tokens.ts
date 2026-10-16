import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { PortfolioItemQuery } from "../../domain/ports/portfolio-item.query.ts";
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
    InstrumentList: Symbol.for(
        "investlab.portfolio.server.InstrumentList",
    ) as ServiceIdentifier<InstrumentListUseCase>,
    InstrumentCreate: Symbol.for(
        "investlab.portfolio.server.InstrumentCreate",
    ) as ServiceIdentifier<InstrumentCreateUseCase>,
    InstrumentUpdate: Symbol.for(
        "investlab.portfolio.server.InstrumentUpdate",
    ) as ServiceIdentifier<InstrumentUpdateUseCase>,
    InstrumentDelete: Symbol.for(
        "investlab.portfolio.server.InstrumentDelete",
    ) as ServiceIdentifier<InstrumentDeleteUseCase>,
} as const;

/** Ports the server use cases depend on; bound by `module.server.ts`, never exported. */
export const PORTFOLIO_PORTS = {
    InstrumentRepository: Symbol.for(
        "investlab.portfolio.server.InstrumentRepository",
    ) as ServiceIdentifier<InstrumentRepository>,
    PortfolioItemRepository: Symbol.for(
        "investlab.portfolio.server.PortfolioItemRepository",
    ) as ServiceIdentifier<PortfolioItemRepository>,
    PortfolioItemQuery: Symbol.for(
        "investlab.portfolio.server.PortfolioItemQuery",
    ) as ServiceIdentifier<PortfolioItemQuery>,
} as const;
