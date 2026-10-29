import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { PORTFOLIO_PORTS } from "#application/server/tokens.ts";
import { PortfolioItemNotFoundError } from "#domain/error/portfolio-item.error.ts";
import type { PortfolioItemRepository } from "#domain/repository/portfolio-item.repository.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";

export type PortfolioItemDeleteError = PortfolioItemNotFoundError | PersistenceError;

@injectable()
export class PortfolioItemDeleteUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository,
    ) {}

    execute(id: string): ResultAsync<void, PortfolioItemDeleteError> {
        return this.portfolioItemRepo.findById(id).andThen((item) => {
            if (!item) {
                return errAsync(new PortfolioItemNotFoundError(id));
            }
            return this.portfolioItemRepo.delete(id);
        });
    }
}
