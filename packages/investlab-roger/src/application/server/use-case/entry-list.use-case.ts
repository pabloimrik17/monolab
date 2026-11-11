import { inject, injectable } from "inversify";
import { ROGER_PORTS } from "#application/server/tokens.ts";
import type { EntryListQuery, EntryListView } from "#domain/query/entry-list.query.ts";
import type { EntryWithInstrument } from "#domain/read-model/entry-with-instrument.read-model.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

export type EntryListError = PersistenceError;

@injectable()
export class EntryListUseCase {
    constructor(
        @inject(ROGER_PORTS.EntryListQuery)
        private readonly entryListQuery: EntryListQuery,
    ) {}

    execute(view: EntryListView): ResultAsync<EntryWithInstrument[], EntryListError> {
        return this.entryListQuery.list(view);
    }
}
