import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { CATALOG_PORTS } from "#application/server/tokens.ts";
import { InstrumentInUseError, InstrumentNotFoundError } from "#domain/error/instrument.error.ts";
import type { InstrumentRepository } from "#domain/repository/instrument.repository.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";

export type InstrumentDeleteError =
    | InstrumentNotFoundError
    | InstrumentInUseError
    | PersistenceError;

@injectable()
export class InstrumentDeleteUseCase {
    constructor(
        @inject(CATALOG_PORTS.InstrumentRepository)
        private readonly instrumentRepo: InstrumentRepository,
    ) {}

    /** Refused while any record references the instrument; the repository reports it. */
    execute(id: string): ResultAsync<void, InstrumentDeleteError> {
        return this.instrumentRepo
            .findById(id)
            .andThen((instrument) =>
                instrument
                    ? this.instrumentRepo.delete(id)
                    : errAsync(new InstrumentNotFoundError(id)),
            );
    }
}
