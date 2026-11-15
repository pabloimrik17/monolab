// fallow-ignore-file code-duplication -- each side binds the same use-case tokens; the module file is the record of its wiring
import { ContainerModule } from "inversify";
import { PORTFOLIO, PORTFOLIO_PORTS } from "#application/client/tokens.ts";
import { PortfolioItemCreateUseCase } from "#application/client/use-case/portfolio-item-create.use-case.ts";
import { PortfolioItemDeleteUseCase } from "#application/client/use-case/portfolio-item-delete.use-case.ts";
import { PortfolioItemListUseCase } from "#application/client/use-case/portfolio-item-list.use-case.ts";
import { PortfolioItemUpdateUseCase } from "#application/client/use-case/portfolio-item-update.use-case.ts";
import { PortfolioItemListApiQuery } from "#data/client/query/portfolio-item-list-api.query.ts";
import { PortfolioItemApiRepository } from "#data/client/repository/portfolio-item-api.repository.ts";

/** Portfolio for the web, through the InvestLab API. Requires `platformClientModule`. */
export const portfolioClientModule = new ContainerModule(({ bind }) => {
    bind(PORTFOLIO_PORTS.PortfolioItemRepository).to(PortfolioItemApiRepository);
    bind(PORTFOLIO_PORTS.PortfolioItemListQuery).to(PortfolioItemListApiQuery);
    bind(PORTFOLIO.ItemCreate).to(PortfolioItemCreateUseCase);
    bind(PORTFOLIO.ItemUpdate).to(PortfolioItemUpdateUseCase);
    bind(PORTFOLIO.ItemDelete).to(PortfolioItemDeleteUseCase);
    bind(PORTFOLIO.ItemList).to(PortfolioItemListUseCase);
});
