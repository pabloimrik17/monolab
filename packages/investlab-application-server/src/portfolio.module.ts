import { ContainerModule } from "inversify";
import { APP_TOKENS } from "./tokens.ts";
import { CreatePortfolioItemUseCase } from "./use-cases/create-portfolio-item.use-case.ts";
import { DeletePortfolioItemUseCase } from "./use-cases/delete-portfolio-item.use-case.ts";
import { ListPortfolioItemsUseCase } from "./use-cases/list-portfolio-items.use-case.ts";
import { UpdatePortfolioItemUseCase } from "./use-cases/update-portfolio-item.use-case.ts";

export const portfolioModule = new ContainerModule(({ bind }) => {
    bind(APP_TOKENS.CreatePortfolioItemUseCase).to(CreatePortfolioItemUseCase);
    bind(APP_TOKENS.UpdatePortfolioItemUseCase).to(UpdatePortfolioItemUseCase);
    bind(APP_TOKENS.DeletePortfolioItemUseCase).to(DeletePortfolioItemUseCase);
    bind(APP_TOKENS.ListPortfolioItemsUseCase).to(ListPortfolioItemsUseCase);
});
