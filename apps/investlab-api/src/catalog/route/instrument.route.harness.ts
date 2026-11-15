import { errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { ApiHarness } from "#core/harness/api.harness.ts";
import { instrumentDtoSchema } from "@m0n0lab/investlab-catalog";
import { CATALOG } from "@m0n0lab/investlab-catalog/server";
import type { Instrument } from "@m0n0lab/investlab-catalog";
import type {
    InstrumentCreateError,
    InstrumentDeleteError,
    InstrumentUpdateError,
} from "@m0n0lab/investlab-catalog/server";

export class InstrumentRouteHarness extends ApiHarness {
    givenInstruments(instruments: Instrument[]) {
        return this.fake(CATALOG.InstrumentList, okAsync(instruments));
    }

    givenCreateSucceeds(instrument: Instrument) {
        return this.fake(CATALOG.InstrumentCreate, okAsync(instrument));
    }

    givenCreateFails(error: InstrumentCreateError) {
        return this.fake(CATALOG.InstrumentCreate, errAsync(error));
    }

    givenUpdateSucceeds(instrument: Instrument) {
        return this.fake(CATALOG.InstrumentUpdate, okAsync(instrument));
    }

    givenUpdateFails(error: InstrumentUpdateError) {
        return this.fake(CATALOG.InstrumentUpdate, errAsync(error));
    }

    givenDeleteSucceeds() {
        return this.fake(CATALOG.InstrumentDelete, okAsync(undefined));
    }

    givenDeleteFails(error: InstrumentDeleteError) {
        return this.fake(CATALOG.InstrumentDelete, errAsync(error));
    }

    listInstruments() {
        return this.reply(this.request("/instruments"), instrumentDtoSchema.array());
    }

    createInstrument(body: unknown) {
        return this.reply(this.json("/instruments", "POST", body), instrumentDtoSchema);
    }

    updateInstrument(id: string, body: unknown) {
        return this.reply(this.json(`/instruments/${id}`, "PUT", body), instrumentDtoSchema);
    }

    updateInstrumentAs(contentType: string, id: string, body: unknown) {
        const response = this.request(`/instruments/${id}`, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: JSON.stringify(body),
        });
        return this.reply(response, instrumentDtoSchema);
    }

    deleteInstrument(id: string) {
        return this.reply(this.request(`/instruments/${id}`, { method: "DELETE" }), z.undefined());
    }
}
