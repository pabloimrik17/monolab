import { inject, injectable } from "inversify";
import { ROGER_PORTS } from "#application/client/tokens.ts";
import type { RogerRemoteError } from "#domain/error/roger-remote.error.ts";
import type { Entry, EntryValues } from "#domain/model/entry.model.ts";
import type {
    EntryRef,
    EntryRemoteRepository,
} from "#domain/repository/entry-remote.repository.ts";
import type { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import type { ResultAsync } from "neverthrow";

export type EntryTransitionError = RogerRemoteError;

@injectable()
export class EntryTransitionUseCase {
    constructor(
        @inject(ROGER_PORTS.EntryRemoteRepository)
        private readonly entryRepo: EntryRemoteRepository,
    ) {}

    // fallow-ignore-next-line code-duplication -- client and server use cases stay separate by design (ADR 0001), even when identical
    execute(
        current: EntryRef,
        to: RogerState,
        values: EntryValues = {},
    ): ResultAsync<Entry, RogerRemoteError> {
        return this.entryRepo.transition(current, to, values);
    }
}
