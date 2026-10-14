import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import {
    PortfolioItemConflictError as PortfolioItemConflictErrorClass,
    PortfolioItemNotFoundError as PortfolioItemNotFoundErrorClass,
    TOKENS,
    type PortfolioItem,
    type PortfolioItemConflictError,
    type PortfolioItemNotFoundError,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";
import type { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";

export type PortfolioItemUpdateError =
    | ValidationError
    | PortfolioItemNotFoundError
    | PortfolioItemConflictError
    | PersistenceError;

@injectable()
export class PortfolioItemUpdateUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository,
    ) {}

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
                return errAsync(new PortfolioItemNotFoundErrorClass(id));
            }
            if (item.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
                return errAsync(new PortfolioItemConflictErrorClass(id));
            }
            const updateResult = item.update(props);
            if (updateResult.isErr()) {
                return errAsync(updateResult.error);
            }
            return this.portfolioItemRepo.update(item, expectedUpdatedAt);
        });
    }
}
