import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { InstrumentNotFoundError, type InstrumentAlreadyExistsError } from "../../domain/errors.ts";
import { PORTFOLIO_PORTS } from "./tokens.ts";
import type { Instrument, InstrumentChanges } from "../../domain/entities/instrument.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";

export type InstrumentUpdateError =
    | ValidationError
    | InstrumentNotFoundError
    | InstrumentAlreadyExistsError
    | PersistenceError;

@injectable()
export class InstrumentUpdateUseCase {
    constructor(
        @inject(PORTFOLIO_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
    ) {}

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
