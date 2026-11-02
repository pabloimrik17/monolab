import { ContainerModule } from "inversify";
import { PORTFOLIO, PORTFOLIO_PORTS } from "#application/server/tokens.ts";
import { InstrumentCreateUseCase } from "#application/server/use-case/instrument-create.use-case.ts";
import { InstrumentDeleteUseCase } from "#application/server/use-case/instrument-delete.use-case.ts";
import { InstrumentListUseCase } from "#application/server/use-case/instrument-list.use-case.ts";
import { InstrumentUpdateUseCase } from "#application/server/use-case/instrument-update.use-case.ts";
import { PortfolioItemCreateUseCase } from "#application/server/use-case/portfolio-item-create.use-case.ts";
import { PortfolioItemDeleteUseCase } from "#application/server/use-case/portfolio-item-delete.use-case.ts";
import { PortfolioItemListUseCase } from "#application/server/use-case/portfolio-item-list.use-case.ts";
import { PortfolioItemUpdateUseCase } from "#application/server/use-case/portfolio-item-update.use-case.ts";
import { PortfolioItemPgQuery } from "#data/server/query/portfolio-item-pg.query.ts";
import { InstrumentPgRepository } from "#data/server/repository/instrument-pg.repository.ts";
import { PortfolioItemPgRepository } from "#data/server/repository/portfolio-item-pg.repository.ts";

/** Portfolio for the API, on Postgres. Requires `platformServerModule`. */
export const portfolioServerModule = new ContainerModule(({ bind }) => {
    bind(PORTFOLIO_PORTS.InstrumentRepository).to(InstrumentPgRepository);
    bind(PORTFOLIO_PORTS.PortfolioItemRepository).to(PortfolioItemPgRepository);
    bind(PORTFOLIO_PORTS.PortfolioItemQuery).to(PortfolioItemPgQuery);
    bind(PORTFOLIO.ItemCreate).to(PortfolioItemCreateUseCase);
    bind(PORTFOLIO.ItemUpdate).to(PortfolioItemUpdateUseCase);
    bind(PORTFOLIO.ItemDelete).to(PortfolioItemDeleteUseCase);
    bind(PORTFOLIO.ItemList).to(PortfolioItemListUseCase);
    bind(PORTFOLIO.InstrumentList).to(InstrumentListUseCase);
    bind(PORTFOLIO.InstrumentCreate).to(InstrumentCreateUseCase);
    bind(PORTFOLIO.InstrumentUpdate).to(InstrumentUpdateUseCase);
    bind(PORTFOLIO.InstrumentDelete).to(InstrumentDeleteUseCase);
});
