import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { ROGER_PORTS } from "#application/server/tokens.ts";
import {
    EntryConflictError,
    EntryNotFoundError,
    type InvalidTransitionError,
    type MissingRequiredFieldError,
} from "#domain/error/entry.error.ts";
import type { Entry, EntryValues } from "#domain/model/entry.model.ts";
import type { EntryRepository } from "#domain/repository/entry.repository.ts";
import type { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import type { PersistenceError, ValidationError } from "@m0n0lab/investlab-core";

export type EntryTransitionError =
    | ValidationError
    | InvalidTransitionError
    | MissingRequiredFieldError
    | EntryNotFoundError
    | EntryConflictError
    | PersistenceError;

@injectable()
export class EntryTransitionUseCase {
    constructor(
        @inject(ROGER_PORTS.EntryRepository)
        private readonly entryRepo: EntryRepository,
    ) {}

    execute(
        id: string,
        to: RogerState,
        values: EntryValues,
        expectedUpdatedAt: Date,
    ): ResultAsync<Entry, EntryTransitionError> {
        return this.entryRepo.findById(id).andThen((entry) => {
            if (!entry) {
                return errAsync(new EntryNotFoundError(id));
            }
            if (entry.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
                return errAsync(new EntryConflictError(id));
            }

            return entry
                .transition(to, values)
                .asyncAndThen(() => this.entryRepo.update(entry, expectedUpdatedAt));
        });
    }
}
