import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { CATALOG_PORTS } from "#application/server/tokens.ts";
import {
    InstrumentNotFoundError,
    type InstrumentAlreadyExistsError,
} from "#domain/error/instrument.error.ts";
import type { Instrument, InstrumentChanges } from "#domain/model/instrument.model.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";

export type InstrumentUpdateError =
    | ValidationError
    | InstrumentNotFoundError
    | InstrumentAlreadyExistsError
    | PersistenceError;

@injectable()
export class InstrumentUpdateUseCase {
    constructor(
        @inject(CATALOG_PORTS.InstrumentRepository)
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
