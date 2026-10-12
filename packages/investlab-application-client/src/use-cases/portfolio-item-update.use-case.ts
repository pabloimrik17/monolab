import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import {
    PortfolioItemNotFoundError,
    TOKENS,
    type PortfolioItem,
    type PortfolioItemRepository,
    type RemotePortError,
} from "@m0n0lab/investlab-domain";

export type PortfolioItemUpdateError = RemotePortError;

@injectable()
export class PortfolioItemUpdateUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository<RemotePortError>,
    ) {}

    execute(
        id: string,
        props: {
            broker?: string;
            targetWeight?: number;
            currentValue?: number;
            notes?: string | undefined;
        },
    ): ResultAsync<PortfolioItem, PortfolioItemUpdateError> {
        return this.portfolioItemRepo.findById(id).andThen((item) => {
            if (!item) {
                return errAsync(new PortfolioItemNotFoundError(id));
            }
            const updateResult = item.update(props);
            if (updateResult.isErr()) {
                return errAsync(updateResult.error);
            }
            return this.portfolioItemRepo.update(item);
        });
    }
}
