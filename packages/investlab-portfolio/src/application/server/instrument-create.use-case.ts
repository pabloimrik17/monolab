import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { Instrument, type InstrumentDraft } from "../../domain/entities/instrument.ts";
import { PORTFOLIO_PORTS } from "./tokens.ts";
import type { InstrumentAlreadyExistsError } from "../../domain/errors.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
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
