import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { InstrumentNotFoundError, type PortfolioRemoteError } from "../../domain/errors.ts";
import { PORTFOLIO_PORTS } from "./tokens.ts";
import type { Instrument, InstrumentChanges } from "../../domain/entities/instrument.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";

export type InstrumentUpdateError = PortfolioRemoteError;

@injectable()
export class InstrumentUpdateUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository<PortfolioRemoteError>,
    ) {}

    // fallow-ignore-next-line code-duplication -- client and server use cases stay separate by design (ADR 0001), even when identical
    execute(
        id: string,
        changes: InstrumentChanges,
    ): ResultAsync<Instrument, InstrumentUpdateError> {
        return this.instrumentRepo.findById(id).andThen((instrument) => {
            if (!instrument) {
                return errAsync(new InstrumentNotFoundError(id));
            }
            const updateResult = instrument.update(changes);
            if (updateResult.isErr()) {
                return errAsync(updateResult.error);
            }
            return this.instrumentRepo.update(instrument);
        });
    }
}
