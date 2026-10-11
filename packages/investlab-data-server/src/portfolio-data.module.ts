import { ContainerModule } from "inversify";
import { TOKENS } from "@m0n0lab/investlab-domain";
import { PgPortfolioItemRepository } from "./repositories/pg-portfolio-item.repository.ts";

export const portfolioDataModule = new ContainerModule(({ bind }) => {
    bind(TOKENS.PortfolioItemRepository).to(PgPortfolioItemRepository);
});
