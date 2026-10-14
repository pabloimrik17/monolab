import type { Instrument } from "../entities/instrument.ts";
import type { InstrumentAlreadyExistsError, InstrumentInUseError } from "../errors.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

// `E` defaults to the server-side failure; HTTP implementations widen it (NotFound, Network, ...).
export interface InstrumentRepository<E extends Error = PersistenceError> {
    /** Fails with `InstrumentAlreadyExistsError` when another instrument has the symbol. */
    save(instrument: Instrument): ResultAsync<Instrument, E | InstrumentAlreadyExistsError>;
    findById(id: string): ResultAsync<Instrument | null, E>;
    findAll(): ResultAsync<Instrument[], E>;
    /** Fails with `InstrumentAlreadyExistsError` when another instrument has the symbol. */
    update(instrument: Instrument): ResultAsync<Instrument, E | InstrumentAlreadyExistsError>;
    /** Fails with `InstrumentInUseError` while a portfolio item references the instrument. */
    delete(id: string): ResultAsync<void, E | InstrumentInUseError>;
}
