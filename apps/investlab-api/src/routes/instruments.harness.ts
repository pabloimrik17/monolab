import { errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { instrumentDtoSchema } from "@m0n0lab/investlab-portfolio";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/server";
import { BaseApiHarness } from "../testing/base-api-harness.ts";
import type { Instrument } from "@m0n0lab/investlab-portfolio";
import type {
    InstrumentCreateError,
    InstrumentDeleteError,
    InstrumentUpdateError,
} from "@m0n0lab/investlab-portfolio/server";

export class InstrumentsHarness extends BaseApiHarness {
    givenInstruments(instruments: Instrument[]) {
        return this.fake(PORTFOLIO.InstrumentList, okAsync(instruments));
    }

    givenCreateSucceeds(instrument: Instrument) {
        return this.fake(PORTFOLIO.InstrumentCreate, okAsync(instrument));
    }

    givenCreateFails(error: InstrumentCreateError) {
        return this.fake(PORTFOLIO.InstrumentCreate, errAsync(error));
    }

    givenUpdateSucceeds(instrument: Instrument) {
        return this.fake(PORTFOLIO.InstrumentUpdate, okAsync(instrument));
    }

    givenUpdateFails(error: InstrumentUpdateError) {
        return this.fake(PORTFOLIO.InstrumentUpdate, errAsync(error));
    }

    givenDeleteSucceeds() {
        return this.fake(PORTFOLIO.InstrumentDelete, okAsync(undefined));
    }

    givenDeleteFails(error: InstrumentDeleteError) {
        return this.fake(PORTFOLIO.InstrumentDelete, errAsync(error));
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

    deleteInstrument(id: string) {
        return this.reply(this.request(`/instruments/${id}`, { method: "DELETE" }), z.undefined());
    }
}
