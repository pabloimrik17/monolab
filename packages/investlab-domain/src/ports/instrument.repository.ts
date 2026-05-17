import type { Instrument } from "../entities/instrument.ts";
import type { PersistenceError } from "../errors.ts";
import type { AssetClass } from "../value-objects/asset-class.ts";
import type { InstrumentType } from "../value-objects/instrument-type.ts";
import type { ResultAsync } from "neverthrow";

export interface InstrumentRepository {
    save(instrument: Instrument): ResultAsync<Instrument, PersistenceError>;
    findById(id: string): ResultAsync<Instrument | null, PersistenceError>;
    findBySymbol(symbol: string): ResultAsync<Instrument | null, PersistenceError>;
    findAll(): ResultAsync<Instrument[], PersistenceError>;
    findByType(type: InstrumentType): ResultAsync<Instrument[], PersistenceError>;
    findByAssetClass(assetClass: AssetClass): ResultAsync<Instrument[], PersistenceError>;
    update(instrument: Instrument): ResultAsync<Instrument, PersistenceError>;
    delete(id: string): ResultAsync<void, PersistenceError>;
    upsertBySymbol(instrument: Instrument): ResultAsync<Instrument, PersistenceError>;
}
