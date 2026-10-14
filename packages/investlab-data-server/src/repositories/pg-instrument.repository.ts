// fallow-ignore-file unused-class-member -- port impl bound in DI, use-cases pending
import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { err, ok, type ResultAsync } from "neverthrow";
import { PersistenceError } from "@m0n0lab/investlab-core";
import {
    type AssetClass,
    type Instrument,
    type InstrumentRepository,
    type InstrumentType,
} from "@m0n0lab/investlab-domain";
import { PLATFORM, type Db } from "@m0n0lab/investlab-platform/server";
import { instrumentToDomain, instrumentToRow } from "../mappers/instrument.mapper.ts";
import { instruments } from "../schema/instruments.ts";

@injectable()
export class PgInstrumentRepository implements InstrumentRepository {
    constructor(@inject(PLATFORM.Db) private readonly db: Db) {}

    save(instrument: Instrument): ResultAsync<Instrument, PersistenceError> {
        return this.db
            .insert((tx) => tx.insert(instruments).values(instrumentToRow(instrument)).returning())
            .map((rows) => instrumentToDomain(rows[0]!));
    }

    findById(id: string): ResultAsync<Instrument | null, PersistenceError> {
        return this.db
            .select((tx) => tx.select().from(instruments).where(eq(instruments.id, id)))
            .map((rows) => (rows.length > 0 ? instrumentToDomain(rows[0]!) : null));
    }

    findBySymbol(symbol: string): ResultAsync<Instrument | null, PersistenceError> {
        const normalized = symbol.trim().toUpperCase();
        return this.db
            .select((tx) => tx.select().from(instruments).where(eq(instruments.symbol, normalized)))
            .map((rows) => (rows.length > 0 ? instrumentToDomain(rows[0]!) : null));
    }

    findAll(): ResultAsync<Instrument[], PersistenceError> {
        return this.db
            .select((tx) => tx.select().from(instruments))
            .map((rows) => rows.map(instrumentToDomain));
    }

    findByType(type: InstrumentType): ResultAsync<Instrument[], PersistenceError> {
        return this.db
            .select((tx) => tx.select().from(instruments).where(eq(instruments.type, type)))
            .map((rows) => rows.map(instrumentToDomain));
    }

    findByAssetClass(assetClass: AssetClass): ResultAsync<Instrument[], PersistenceError> {
        return this.db
            .select((tx) =>
                tx.select().from(instruments).where(eq(instruments.assetClass, assetClass)),
            )
            .map((rows) => rows.map(instrumentToDomain));
    }

    update(instrument: Instrument): ResultAsync<Instrument, PersistenceError> {
        const row = instrumentToRow(instrument);
        return this.db
            .update((tx) =>
                tx
                    .update(instruments)
                    .set(row)
                    .where(eq(instruments.id, instrument.id))
                    .returning(),
            )
            .andThen((rows) =>
                rows.length === 0
                    ? err(new PersistenceError(`Instrument not found: ${instrument.id}`))
                    : ok(instrumentToDomain(rows[0]!)),
            );
    }

    delete(id: string): ResultAsync<void, PersistenceError> {
        return this.db
            .delete((tx) => tx.delete(instruments).where(eq(instruments.id, id)))
            .map(() => undefined);
    }

    upsertBySymbol(instrument: Instrument): ResultAsync<Instrument, PersistenceError> {
        const normalized = instrument.symbol.trim().toUpperCase();
        const row = instrumentToRow(instrument);
        return this.db
            .insert((tx) =>
                tx
                    .insert(instruments)
                    .values({ ...row, symbol: normalized })
                    .onConflictDoNothing({ target: instruments.symbol }),
            )
            .andThen(() =>
                this.db.select((tx) =>
                    tx.select().from(instruments).where(eq(instruments.symbol, normalized)),
                ),
            )
            .map((rows) => instrumentToDomain(rows[0]!));
    }
}
