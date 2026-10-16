import { inject, injectable } from "inversify";
import {
    TOKENS,
    type PortfolioItemRepository,
    type PortfolioRemoteError,
} from "@m0n0lab/investlab-domain";
import type { ResultAsync } from "neverthrow";

export type PortfolioItemDeleteError = PortfolioRemoteError;

@injectable()
export class PortfolioItemDeleteUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository<PortfolioRemoteError>,
    ) {}

    // The API answers 404 for unknown ids; the data layer rebuilds PortfolioItemNotFoundError.
    execute(id: string): ResultAsync<void, PortfolioItemDeleteError> {
        return this.portfolioItemRepo.delete(id);
    }
}
