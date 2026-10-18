import { errAsync, okAsync } from "neverthrow";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/server";
import { BaseApiHarness } from "../testing/base-api-harness.ts";
import type { Instrument } from "@m0n0lab/investlab-portfolio";
import type {
    InstrumentCreateError,
    InstrumentDeleteError,
    InstrumentListError,
    InstrumentUpdateError,
} from "@m0n0lab/investlab-portfolio/server";

/** `/instruments` over HTTP; each `given*` arranges one use case and returns its recorder. */
export class InstrumentsHarness extends BaseApiHarness {
    givenInstruments(instruments: Instrument[]) {
        return this.fake(PORTFOLIO.InstrumentList, okAsync(instruments));
    }

    givenListFails(error: InstrumentListError) {
        return this.fake(PORTFOLIO.InstrumentList, errAsync(error));
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

    listInstruments(): Promise<Response> {
        return this.request("/instruments");
    }

    createInstrument(body: unknown): Promise<Response> {
        return this.json("/instruments", "POST", body);
    }

    updateInstrument(id: string, body: unknown): Promise<Response> {
        return this.json(`/instruments/${id}`, "PUT", body);
    }

    deleteInstrument(id: string): Promise<Response> {
        return this.request(`/instruments/${id}`, { method: "DELETE" });
    }
}
