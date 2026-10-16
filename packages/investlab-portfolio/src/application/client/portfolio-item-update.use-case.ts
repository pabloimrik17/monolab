import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import {
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
    type PortfolioRemoteError,
} from "../../domain/errors.ts";
import { PORTFOLIO_PORTS } from "./tokens.ts";
import type { PortfolioItem } from "../../domain/entities/portfolio-item.ts";
import type { PortfolioItemRepository } from "../../domain/ports/portfolio-item.repository.ts";

export type PortfolioItemUpdateError = PortfolioRemoteError;

@injectable()
export class PortfolioItemUpdateUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository<PortfolioRemoteError>,
    ) {}

    // fallow-ignore-next-line code-duplication -- client and server use cases stay separate by design (ADR 0001), even when identical
    execute(
        id: string,
        props: {
            broker?: string;
            targetWeight?: number;
            currentValue?: number;
            notes?: string | undefined;
        },
        expectedUpdatedAt: Date,
    ): ResultAsync<PortfolioItem, PortfolioItemUpdateError> {
        return this.portfolioItemRepo.findById(id).andThen((item) => {
            if (!item) {
                return errAsync(new PortfolioItemNotFoundError(id));
            }
            if (item.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
                return errAsync(new PortfolioItemConflictError(id));
            }
            const updateResult = item.update(props);
            if (updateResult.isErr()) {
                return errAsync(updateResult.error);
            }
            return this.portfolioItemRepo.update(item, expectedUpdatedAt);
        });
    }
}
