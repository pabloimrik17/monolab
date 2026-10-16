import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import {
    InstrumentNotFoundError as InstrumentNotFoundErrorClass,
    PortfolioItem,
    TOKENS,
    type InstrumentNotFoundError,
    type InstrumentRepository,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";
import type { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";

export type PortfolioItemCreateError = ValidationError | InstrumentNotFoundError | PersistenceError;

@injectable()
export class PortfolioItemCreateUseCase {
    constructor(
        @inject(TOKENS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
        @inject(TOKENS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository,
    ) {}

    execute(props: {
        instrumentId: string;
        broker: string;
        targetWeight: number;
        currentValue?: number;
        notes?: string;
    }): ResultAsync<PortfolioItem, PortfolioItemCreateError> {
        return this.instrumentRepo.findById(props.instrumentId).andThen((instrument) => {
            if (!instrument) {
                return errAsync(new InstrumentNotFoundErrorClass(props.instrumentId));
            }
            const result = PortfolioItem.create(props);
            if (result.isErr()) {
                return errAsync(result.error);
            }
            return this.portfolioItemRepo.save(result.value);
        });
    }
}
