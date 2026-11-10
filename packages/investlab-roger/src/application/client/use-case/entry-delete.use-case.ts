import { inject, injectable } from "inversify";
import { ROGER_PORTS } from "#application/client/tokens.ts";
import type { RogerRemoteError } from "#domain/error/roger-remote.error.ts";
import type { EntryRemoteRepository } from "#domain/repository/entry-remote.repository.ts";
import type { ResultAsync } from "neverthrow";

export type EntryDeleteError = RogerRemoteError;

@injectable()
export class EntryDeleteUseCase {
    constructor(
        @inject(ROGER_PORTS.EntryRemoteRepository)
        private readonly entryRepo: EntryRemoteRepository,
    ) {}

    // fallow-ignore-next-line code-duplication -- client and server use cases stay separate by design (ADR 0001), even when identical
    execute(id: string): ResultAsync<void, RogerRemoteError> {
        return this.entryRepo.delete(id);
    }
}
