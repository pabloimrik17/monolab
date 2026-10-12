import { inject, injectable } from "inversify";
import { TOKENS, type PortfolioItemRepository } from "@m0n0lab/investlab-domain";
import type { ClientPortError } from "../client-port-error.ts";
import type { ResultAsync } from "neverthrow";

export type PortfolioItemDeleteError = ClientPortError;

@injectable()
export class PortfolioItemDeleteUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository<ClientPortError>,
    ) {}

    // The API answers 404 for unknown ids; the data layer rebuilds PortfolioItemNotFoundError.
    execute(id: string): ResultAsync<void, PortfolioItemDeleteError> {
        return this.portfolioItemRepo.delete(id);
    }
}
