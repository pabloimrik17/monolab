import { inject, injectable } from "inversify";
import { ROGER_PORTS } from "#application/client/tokens.ts";
import type { RogerRemoteError } from "#domain/error/roger-remote.error.ts";
import type { EntryListQuery, EntryListView } from "#domain/query/entry-list.query.ts";
import type { EntryWithInstrument } from "#domain/read-model/entry-with-instrument.read-model.ts";
import type { ResultAsync } from "neverthrow";

export type EntryListError = RogerRemoteError;

@injectable()
export class EntryListUseCase {
    constructor(
        @inject(ROGER_PORTS.EntryListQuery)
        private readonly entryListQuery: EntryListQuery<RogerRemoteError>,
    ) {}

    execute(view: EntryListView = "active"): ResultAsync<EntryWithInstrument[], RogerRemoteError> {
        return this.entryListQuery.list(view);
    }
}
