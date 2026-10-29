import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { PORTFOLIO_PORTS } from "#application/server/tokens.ts";
import { InstrumentNotFoundError } from "#domain/error/instrument.error.ts";
import { PortfolioItem } from "#domain/model/portfolio-item.model.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { PortfolioItemRepository } from "#domain/repository/portfolio-item.repository.ts";
import type { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";

export type PortfolioItemCreateError = ValidationError | InstrumentNotFoundError | PersistenceError;

@injectable()
export class PortfolioItemCreateUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
        @inject(PORTFOLIO_PORTS.PortfolioItemRepository)
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
                return errAsync(new InstrumentNotFoundError(props.instrumentId));
            }
            const result = PortfolioItem.create(props);
            if (result.isErr()) {
                return errAsync(result.error);
            }
            return this.portfolioItemRepo.save(result.value);
        });
    }
}
