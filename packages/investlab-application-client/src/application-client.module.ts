import { ContainerModule } from "inversify";
import { APP_TOKENS } from "./tokens.ts";
import { InstrumentListUseCase } from "./use-cases/instrument-list.use-case.ts";
import { PortfolioItemCreateUseCase } from "./use-cases/portfolio-item-create.use-case.ts";
import { PortfolioItemDeleteUseCase } from "./use-cases/portfolio-item-delete.use-case.ts";
import { PortfolioItemListUseCase } from "./use-cases/portfolio-item-list.use-case.ts";
import { PortfolioItemUpdateUseCase } from "./use-cases/portfolio-item-update.use-case.ts";

export const applicationClientModule = new ContainerModule(({ bind }) => {
    bind(APP_TOKENS.PortfolioItemCreateUseCase).to(PortfolioItemCreateUseCase);
    bind(APP_TOKENS.PortfolioItemUpdateUseCase).to(PortfolioItemUpdateUseCase);
    bind(APP_TOKENS.PortfolioItemDeleteUseCase).to(PortfolioItemDeleteUseCase);
    bind(APP_TOKENS.PortfolioItemListUseCase).to(PortfolioItemListUseCase);
    bind(APP_TOKENS.InstrumentListUseCase).to(InstrumentListUseCase);
});
