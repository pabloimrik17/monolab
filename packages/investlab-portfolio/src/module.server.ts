import { ContainerModule } from "inversify";
import { InstrumentListUseCase } from "./application/server/instrument-list.use-case.ts";
import { PortfolioItemCreateUseCase } from "./application/server/portfolio-item-create.use-case.ts";
import { PortfolioItemDeleteUseCase } from "./application/server/portfolio-item-delete.use-case.ts";
import { PortfolioItemListUseCase } from "./application/server/portfolio-item-list.use-case.ts";
import { PortfolioItemUpdateUseCase } from "./application/server/portfolio-item-update.use-case.ts";
import { PORTFOLIO, PORTFOLIO_PORTS } from "./application/server/tokens.ts";
import { PgInstrumentRepository } from "./data/server/pg-instrument.repository.ts";
import { PgPortfolioItemQuery } from "./data/server/pg-portfolio-item.query.ts";
import { PgPortfolioItemRepository } from "./data/server/pg-portfolio-item.repository.ts";

/** Portfolio for the API, on Postgres. Requires `platformServerModule`. */
export const portfolioServerModule = new ContainerModule(({ bind }) => {
    bind(PORTFOLIO_PORTS.InstrumentRepository).to(PgInstrumentRepository);
    bind(PORTFOLIO_PORTS.PortfolioItemRepository).to(PgPortfolioItemRepository);
    bind(PORTFOLIO_PORTS.PortfolioItemQuery).to(PgPortfolioItemQuery);
    bind(PORTFOLIO.ItemCreate).to(PortfolioItemCreateUseCase);
    bind(PORTFOLIO.ItemUpdate).to(PortfolioItemUpdateUseCase);
    bind(PORTFOLIO.ItemDelete).to(PortfolioItemDeleteUseCase);
    bind(PORTFOLIO.ItemList).to(PortfolioItemListUseCase);
    bind(PORTFOLIO.InstrumentList).to(InstrumentListUseCase);
});
