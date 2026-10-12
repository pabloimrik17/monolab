import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/investlab-domain";
import { PgPortfolioItemQuery } from "./queries/pg-portfolio-item.query.ts";
import { PgPortfolioItemRepository } from "./repositories/pg-portfolio-item.repository.ts";

export const portfolioDataModule = new ContainerModule(({ bind }) => {
    bind(TOKENS.PortfolioItemRepository).to(PgPortfolioItemRepository);
    bind(TOKENS.PortfolioItemQuery).to(PgPortfolioItemQuery);
});
