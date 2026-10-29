import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { PORTFOLIO_PORTS } from "#application/server/tokens.ts";
import { Instrument, type InstrumentDraft } from "#domain/model/instrument.model.ts";
import type { InstrumentAlreadyExistsError } from "#domain/error/instrument.error.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";

export type InstrumentCreateError =
    | ValidationError
    | InstrumentAlreadyExistsError
    | PersistenceError;

@injectable()
export class InstrumentCreateUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
    ) {}

    execute(draft: InstrumentDraft): ResultAsync<Instrument, InstrumentCreateError> {
        const result = Instrument.create(draft);
        if (result.isErr()) {
            return errAsync(result.error);
        }
        return this.instrumentRepo.save(result.value);
    }
}
