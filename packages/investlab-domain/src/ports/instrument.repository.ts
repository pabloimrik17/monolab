import type { Instrument } from "../entities/instrument.ts";
import type { AssetClass } from "../value-objects/asset-class.ts";
import type { InstrumentType } from "../value-objects/instrument-type.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

// `E` defaults to the server-side failure; HTTP implementations widen it (NotFound, Network, ...).
export interface InstrumentRepository<E extends Error = PersistenceError> {
    save(instrument: Instrument): ResultAsync<Instrument, E>;
    findById(id: string): ResultAsync<Instrument | null, E>;
    findBySymbol(symbol: string): ResultAsync<Instrument | null, E>;
    findAll(): ResultAsync<Instrument[], E>;
    findByType(type: InstrumentType): ResultAsync<Instrument[], E>;
    findByAssetClass(assetClass: AssetClass): ResultAsync<Instrument[], E>;
    update(instrument: Instrument): ResultAsync<Instrument, E>;
    delete(id: string): ResultAsync<void, E>;
    upsertBySymbol(instrument: Instrument): ResultAsync<Instrument, E>;
}
