import { inject, injectable } from "inversify";
import { PORTFOLIO_PORTS } from "#application/client/tokens.ts";
import type { PortfolioRemoteError } from "#domain/error/portfolio-remote.error.ts";
import type { Instrument } from "#domain/model/instrument.model.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { ResultAsync } from "neverthrow";

export type InstrumentListError = PortfolioRemoteError;

@injectable()
export class InstrumentListUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<PortfolioRemoteError>,
    ) {}

    execute(): ResultAsync<Instrument[], InstrumentListError> {
        return this.instrumentRepo.findAll();
    }
}
