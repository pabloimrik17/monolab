import { inject, injectable } from "inversify";
import { ROGER_PORTS } from "#application/client/tokens.ts";
import type { RogerRemoteError } from "#domain/error/roger-remote.error.ts";
import type { Entry, EntryValues } from "#domain/model/entry.model.ts";
import type {
    EntryRef,
    EntryRemoteRepository,
} from "#domain/repository/entry-remote.repository.ts";
import type { ResultAsync } from "neverthrow";

export type EntryReEnterError = RogerRemoteError;

@injectable()
export class EntryReEnterUseCase {
    constructor(
        @inject(ROGER_PORTS.EntryRemoteRepository)
        private readonly entryRepo: EntryRemoteRepository,
    ) {}

    // The API is the authority on the rules; its refusals come back as the domain errors.
    // fallow-ignore-next-line code-duplication -- client and server use cases stay separate by design (ADR 0001), even when identical
    execute(
        current: Pick<EntryRef, "id" | "state">,
        values: Pick<EntryValues, "entryPrice" | "quantity"> = {},
    ): ResultAsync<Entry, RogerRemoteError> {
        return this.entryRepo.reEnter(current, values);
    }
}
