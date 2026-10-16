import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import {
    PortfolioItem,
    TOKENS,
    type PortfolioItemRepository,
    type RemotePortError,
} from "@m0n0lab/investlab-domain";

export type PortfolioItemCreateError = RemotePortError;

@injectable()
export class PortfolioItemCreateUseCase {
    constructor(
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository<RemotePortError>,
    ) {}

    // Instrument existence is enforced by the API (INSTRUMENT_NOT_FOUND), not pre-checked here.
    execute(props: {
        instrumentId: string;
        broker: string;
        targetWeight: number;
        currentValue?: number;
        notes?: string;
    }): ResultAsync<PortfolioItem, PortfolioItemCreateError> {
        const result = PortfolioItem.create(props);
        if (result.isErr()) {
            return errAsync(result.error);
        }
        return this.portfolioItemRepo.save(result.value);
    }
}
