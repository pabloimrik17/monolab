import { inject, injectable } from "inversify";
import { errAsync, type ResultAsync } from "neverthrow";
import { ROGER_PORTS } from "#application/server/tokens.ts";
import { EntryNotFoundError } from "#domain/error/entry.error.ts";
import type { EntryRepository } from "#domain/repository/entry.repository.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";

export type EntryDeleteError = EntryNotFoundError | PersistenceError;

@injectable()
export class EntryDeleteUseCase {
    constructor(
        @inject(ROGER_PORTS.EntryRepository)
        private readonly entryRepo: EntryRepository,
    ) {}

    execute(id: string): ResultAsync<void, EntryDeleteError> {
        return this.entryRepo.findById(id).andThen((entry) => {
            if (!entry) {
                return errAsync(new EntryNotFoundError(id));
            }

            return this.entryRepo.delete(id);
        });
    }
}
