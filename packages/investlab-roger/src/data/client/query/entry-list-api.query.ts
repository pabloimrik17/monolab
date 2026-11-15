import { inject, injectable } from "inversify";
import { entryWithInstrumentToDomain } from "#data/client/mapper/entry-dto.mapper.ts";
import { entryListDtoSchema } from "#data/shared/dto/entry.dto.ts";
import { PLATFORM, type InvestlabApiClient } from "@m0n0lab/investlab-platform/client";
import type { RogerRemoteError } from "#domain/error/roger-remote.error.ts";
import type { EntryListQuery, EntryListView } from "#domain/query/entry-list.query.ts";
import type { EntryWithInstrument } from "#domain/read-model/entry-with-instrument.read-model.ts";
import type { ResultAsync } from "neverthrow";

@injectable()
export class EntryListApiQuery implements EntryListQuery<RogerRemoteError> {
    constructor(@inject(PLATFORM.InvestlabApiClient) private readonly api: InvestlabApiClient) {}

    list(view: EntryListView): ResultAsync<EntryWithInstrument[], RogerRemoteError> {
        return this.api
            .json("GET", `/roger/entries?view=${view}`, entryListDtoSchema)
            .map((dtos) => dtos.map(entryWithInstrumentToDomain));
    }
}
