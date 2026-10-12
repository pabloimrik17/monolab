import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import {
    PortfolioItemNotFoundError as PortfolioItemNotFoundErrorClass,
    TOKENS,
    type PersistenceError,
    type PortfolioItem,
    type PortfolioItemNotFoundError,
    type PortfolioItemRepository,
    type ValidationError,
} from "@m0n0lab/investlab-domain";

@injectable()
export class UpdatePortfolioItemUseCase {
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
    ): ResultAsync<PortfolioItem, ValidationError | PortfolioItemNotFoundError | PersistenceError> {
        return this.portfolioItemRepo.findById(id).andThen((item) => {
            if (!item) {
                return errAsync(new PortfolioItemNotFoundErrorClass(id));
            }
            const updateResult = item.update(props);
            if (updateResult.isErr()) {
                return errAsync(updateResult.error);
            }
            return this.portfolioItemRepo.update(item);
        });
    }
}
