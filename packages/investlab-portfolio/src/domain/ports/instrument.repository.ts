import type { Instrument } from "../entities/instrument.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

// `E` defaults to the server-side failure; HTTP implementations widen it (NotFound, Network, ...).
export interface InstrumentRepository<E extends Error = PersistenceError> {
    save(instrument: Instrument): ResultAsync<Instrument, E>;
    findById(id: string): ResultAsync<Instrument | null, E>;
    findAll(): ResultAsync<Instrument[], E>;
}
