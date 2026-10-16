import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import {
    PortfolioItemNotFoundError as PortfolioItemNotFoundErrorClass,
    TOKENS,
    type PersistenceError,
    type PortfolioItemNotFoundError,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";

export type PortfolioItemDeleteError = PortfolioItemNotFoundError | PersistenceError;

@injectable()
export class PortfolioItemDeleteUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository,
    ) {}

    execute(id: string): ResultAsync<void, PortfolioItemDeleteError> {
        return this.portfolioItemRepo.findById(id).andThen((item) => {
            if (!item) {
                return errAsync(new PortfolioItemNotFoundErrorClass(id));
            }
            return this.portfolioItemRepo.delete(id);
        });
    }
}
