import { inject, injectable } from "inversify";
import { PORTFOLIO_PORTS } from "./tokens.ts";
import type { PortfolioRemoteError } from "../../domain/errors.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { ResultAsync } from "neverthrow";

export type InstrumentDeleteError = PortfolioRemoteError;

@injectable()
export class InstrumentDeleteUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<PortfolioRemoteError>,
    ) {}

    // The API refuses an instrument still held (INSTRUMENT_IN_USE); the data layer rebuilds the error.
    execute(id: string): ResultAsync<void, InstrumentDeleteError> {
        return this.instrumentRepo.delete(id);
    }
}
