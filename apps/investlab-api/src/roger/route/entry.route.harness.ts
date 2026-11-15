import { errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { ApiHarness } from "#core/harness/api.harness.ts";
import { entryDtoSchema, entryListDtoSchema } from "@m0n0lab/investlab-roger";
import { ROGER } from "@m0n0lab/investlab-roger/server";
import type { Entry, EntryWithInstrument } from "@m0n0lab/investlab-roger";
import type {
    EntryCreateError,
    EntryDeleteError,
    EntryEditError,
    EntryReEnterError,
    EntryTransitionError,
} from "@m0n0lab/investlab-roger/server";

export class EntryRouteHarness extends ApiHarness {
    givenEntries(rows: EntryWithInstrument[]) {
        return this.fake(ROGER.EntryList, okAsync(rows));
    }

    givenCreateSucceeds(entry: Entry) {
        return this.fake(ROGER.EntryCreate, okAsync(entry));
    }

    givenEditSucceeds(entry: Entry) {
        return this.fake(ROGER.EntryEdit, okAsync(entry));
    }

    givenEditFails(error: EntryEditError) {
        return this.fake(ROGER.EntryEdit, errAsync(error));
    }

    givenTransitionSucceeds(entry: Entry) {
        return this.fake(ROGER.EntryTransition, okAsync(entry));
    }

    givenTransitionFails(error: EntryTransitionError) {
        return this.fake(ROGER.EntryTransition, errAsync(error));
    }

    givenReEnterSucceeds(entry: Entry) {
        return this.fake(ROGER.EntryReEnter, okAsync(entry));
    }

    givenCreateFails(error: EntryCreateError) {
        return this.fake(ROGER.EntryCreate, errAsync(error));
    }

    givenReEnterFails(error: EntryReEnterError) {
        return this.fake(ROGER.EntryReEnter, errAsync(error));
    }

    givenDeleteSucceeds() {
        return this.fake(ROGER.EntryDelete, okAsync(undefined));
    }

    givenDeleteFails(error: EntryDeleteError) {
        return this.fake(ROGER.EntryDelete, errAsync(error));
    }

    listEntries(query = "") {
        return this.reply(this.request(`/roger/entries${query}`), entryListDtoSchema);
    }

    createEntry(body: unknown) {
        return this.reply(this.json("/roger/entries", "POST", body), entryDtoSchema);
    }

    editEntry(id: string, body: unknown) {
        return this.reply(this.json(`/roger/entries/${id}`, "PUT", body), entryDtoSchema);
    }

    deleteEntry(id: string) {
        return this.reply(
            this.request(`/roger/entries/${id}`, { method: "DELETE" }),
            z.undefined(),
        );
    }

    transition(id: string, body: unknown) {
        return this.reply(
            this.json(`/roger/entries/${id}/transitions`, "POST", body),
            entryDtoSchema,
        );
    }

    reEnter(id: string, body: unknown) {
        return this.reply(
            this.json(`/roger/entries/${id}/re-entries`, "POST", body),
            entryDtoSchema,
        );
    }
}
