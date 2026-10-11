import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import {
    PortfolioItemNotFoundError as PortfolioItemNotFoundErrorClass,
    TOKENS,
    type PersistenceError,
    type PortfolioItemNotFoundError,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";

@injectable()
export class DeletePortfolioItemUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository,
    ) {}

    execute(id: string): ResultAsync<void, PortfolioItemNotFoundError | PersistenceError> {
        return this.portfolioItemRepo.findById(id).andThen((item) => {
            if (!item) {
                return errAsync(new PortfolioItemNotFoundErrorClass(id));
            }
            return this.portfolioItemRepo.delete(id);
        });
    }
}
