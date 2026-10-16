import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { InstrumentInUseError, InstrumentNotFoundError } from "../../domain/errors.ts";
import { PORTFOLIO_PORTS } from "./tokens.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { PortfolioItemRepository } from "../../domain/ports/portfolio-item.repository.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";

export type InstrumentDeleteError =
    | InstrumentNotFoundError
    | InstrumentInUseError
    | PersistenceError;

@injectable()
export class InstrumentDeleteUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
        @inject(PORTFOLIO_PORTS.PortfolioItemRepository)
        private readonly portfolioItemRepo: PortfolioItemRepository,
    ) {}

    /** Refused while any portfolio item holds the instrument. */
    execute(id: string): ResultAsync<void, InstrumentDeleteError> {
        return this.instrumentRepo.findById(id).andThen((instrument) => {
            if (!instrument) {
                return errAsync(new InstrumentNotFoundError(id));
            }
            return this.portfolioItemRepo
                .existsForInstrument(id)
                .andThen((inUse) =>
                    inUse ? errAsync(new InstrumentInUseError(id)) : this.instrumentRepo.delete(id),
                );
        });
    }
}
