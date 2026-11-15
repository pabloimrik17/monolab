import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { ROGER_PORTS } from "#application/server/tokens.ts";
import {
    EntryNotFoundError,
    type InvalidTransitionError,
    type MissingRequiredFieldError,
} from "#domain/error/entry.error.ts";
import type { Entry, EntryValues } from "#domain/model/entry.model.ts";
import type { EntryRepository } from "#domain/repository/entry.repository.ts";
import type { InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import type { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";

export type EntryReEnterError =
    | ValidationError
    | InvalidTransitionError
    | MissingRequiredFieldError
    | EntryNotFoundError
    | InstrumentNotFoundError
    | PersistenceError;

@injectable()
export class EntryReEnterUseCase {
    constructor(
        @inject(ROGER_PORTS.EntryRepository)
        private readonly entryRepo: EntryRepository,
    ) {}

    execute(
        id: string,
        values: Pick<EntryValues, "entryPrice" | "quantity">,
    ): ResultAsync<Entry, EntryReEnterError> {
        return this.entryRepo.findById(id).andThen((sold) => {
            if (!sold) {
                return errAsync(new EntryNotFoundError(id));
            }

            return sold.reEnter(values).asyncAndThen((entry) => this.entryRepo.save(entry));
        });
    }
}
