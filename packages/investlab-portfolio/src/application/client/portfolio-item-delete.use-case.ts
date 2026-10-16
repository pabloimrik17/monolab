import { inject, injectable } from "inversify";
import { PORTFOLIO_PORTS } from "./tokens.ts";
import type { PortfolioRemoteError } from "../../domain/errors.ts";
import type { PortfolioItemRepository } from "../../domain/ports/portfolio-item.repository.ts";
import type { ResultAsync } from "neverthrow";

export type PortfolioItemDeleteError = PortfolioRemoteError;

@injectable()
export class PortfolioItemDeleteUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository<PortfolioRemoteError>,
    ) {}

    // The API answers 404 for unknown ids; the data layer rebuilds PortfolioItemNotFoundError.
    execute(id: string): ResultAsync<void, PortfolioItemDeleteError> {
        return this.portfolioItemRepo.delete(id);
    }
}
