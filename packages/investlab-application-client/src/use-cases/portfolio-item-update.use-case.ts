import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import {
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
    TOKENS,
    type PortfolioItem,
    type PortfolioItemRepository,
    type PortfolioRemoteError,
} from "@m0n0lab/investlab-domain";

export type PortfolioItemUpdateError = PortfolioRemoteError;

@injectable()
export class PortfolioItemUpdateUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository<PortfolioRemoteError>,
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
