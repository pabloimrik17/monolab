import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { PORTFOLIO_PORTS } from "#application/client/tokens.ts";
import { Instrument, type InstrumentDraft } from "#domain/model/instrument.model.ts";
import type { PortfolioRemoteError } from "#domain/error/portfolio-remote.error.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";

export type InstrumentCreateError = PortfolioRemoteError;

@injectable()
export class InstrumentCreateUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<PortfolioRemoteError>,
    ) {}

    // Symbol uniqueness is enforced by the API (INSTRUMENT_ALREADY_EXISTS), not pre-checked here.
    // fallow-ignore-next-line code-duplication -- client and server use cases stay separate by design (ADR 0001), even when identical
    execute(draft: InstrumentDraft): ResultAsync<Instrument, InstrumentCreateError> {
        const result = Instrument.create(draft);
        if (result.isErr()) {
            return errAsync(result.error);
        }

        return this.instrumentRepo.save(result.value);
    }
}
