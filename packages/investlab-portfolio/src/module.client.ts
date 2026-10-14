// fallow-ignore-file code-duplication -- each side binds the same use-case tokens; the module file is the record of its wiring
import { ContainerModule } from "inversify";
import { InstrumentListUseCase } from "./application/client/instrument-list.use-case.ts";
import { PortfolioItemCreateUseCase } from "./application/client/portfolio-item-create.use-case.ts";
import { PortfolioItemDeleteUseCase } from "./application/client/portfolio-item-delete.use-case.ts";
import { PortfolioItemListUseCase } from "./application/client/portfolio-item-list.use-case.ts";
import { PortfolioItemUpdateUseCase } from "./application/client/portfolio-item-update.use-case.ts";
import { PORTFOLIO, PORTFOLIO_PORTS } from "./application/client/tokens.ts";
import { HttpInstrumentRepository } from "./data/client/http-instrument.repository.ts";
import { HttpPortfolioItemQuery } from "./data/client/http-portfolio-item.query.ts";
import { HttpPortfolioItemRepository } from "./data/client/http-portfolio-item.repository.ts";

/** Portfolio for the web, through the InvestLab API. Requires `platformClientModule`. */
export const portfolioClientModule = new ContainerModule(({ bind }) => {
    bind(PORTFOLIO_PORTS.InstrumentRepository).to(HttpInstrumentRepository);
    bind(PORTFOLIO_PORTS.PortfolioItemRepository).to(HttpPortfolioItemRepository);
    bind(PORTFOLIO_PORTS.PortfolioItemListQuery).to(HttpPortfolioItemQuery);
    bind(PORTFOLIO.ItemCreate).to(PortfolioItemCreateUseCase);
    bind(PORTFOLIO.ItemUpdate).to(PortfolioItemUpdateUseCase);
    bind(PORTFOLIO.ItemDelete).to(PortfolioItemDeleteUseCase);
    bind(PORTFOLIO.ItemList).to(PortfolioItemListUseCase);
    bind(PORTFOLIO.InstrumentList).to(InstrumentListUseCase);
});
