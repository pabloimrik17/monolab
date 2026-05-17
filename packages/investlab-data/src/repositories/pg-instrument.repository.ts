import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { ResultAsync } from "neverthrow";
import {
    PersistenceError,
    type AssetClass,
    type Instrument,
    type InstrumentRepository,
    type InstrumentType,
} from "@m0n0lab/investlab-domain";
import { instrumentToDomain, instrumentToRow } from "../mappers/instrument.mapper.ts";
import { instruments } from "../schema/instruments.ts";
import { DATA_TOKENS } from "../tokens.ts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

@injectable()
export class PgInstrumentRepository implements InstrumentRepository {
    constructor(@inject(DATA_TOKENS.DrizzleDb) private readonly db: NodePgDatabase) {}

    save(instrument: Instrument): ResultAsync<Instrument, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.insert(instruments).values(instrumentToRow(instrument)).returning(),
            (e) => new PersistenceError(e),
        ).map((rows) => instrumentToDomain(rows[0]!));
    }

    findById(id: string): ResultAsync<Instrument | null, PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(instruments).where(eq(instruments.id, id)),
            (e) => new PersistenceError(e),
        ).map((rows) => (rows.length > 0 ? instrumentToDomain(rows[0]!) : null));
    }

    findBySymbol(symbol: string): ResultAsync<Instrument | null, PersistenceError> {
        const normalized = symbol.trim().toUpperCase();
        return ResultAsync.fromPromise(
            this.db.select().from(instruments).where(eq(instruments.symbol, normalized)),
            (e) => new PersistenceError(e),
        ).map((rows) => (rows.length > 0 ? instrumentToDomain(rows[0]!) : null));
    }

    findAll(): ResultAsync<Instrument[], PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(instruments),
            (e) => new PersistenceError(e),
        ).map((rows) => rows.map(instrumentToDomain));
    }

    findByType(type: InstrumentType): ResultAsync<Instrument[], PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(instruments).where(eq(instruments.type, type)),
            (e) => new PersistenceError(e),
        ).map((rows) => rows.map(instrumentToDomain));
    }

    findByAssetClass(assetClass: AssetClass): ResultAsync<Instrument[], PersistenceError> {
        return ResultAsync.fromPromise(
            this.db.select().from(instruments).where(eq(instruments.assetClass, assetClass)),
            (e) => new PersistenceError(e),
        ).map((rows) => rows.map(instrumentToDomain));
    }

    update(instrument: Instrument): ResultAsync<Instrument, PersistenceError> {
        const row = instrumentToRow(instrument);
        return ResultAsync.fromPromise(
            (async () => {
                const rows = await this.db
                    .update(instruments)
                    .set(row)
                    .where(eq(instruments.id, instrument.id))
                    .returning();
                if (rows.length === 0) {
                    throw new PersistenceError(`Instrument not found: ${instrument.id}`);
                }
                return rows;
            })(),
            (e) => new PersistenceError(e),
        ).map((rows) => instrumentToDomain(rows[0]!));
    }

    delete(id: string): ResultAsync<void, PersistenceError> {
        return ResultAsync.fromPromise(
            (async () => {
                await this.db.delete(instruments).where(eq(instruments.id, id));
            })(),
            (e) => new PersistenceError(e),
        );
    }

    upsertBySymbol(instrument: Instrument): ResultAsync<Instrument, PersistenceError> {
        const normalized = instrument.symbol.trim().toUpperCase();
        return ResultAsync.fromPromise(
            (async () => {
                const row = instrumentToRow(instrument);
                await this.db
                    .insert(instruments)
                    .values({ ...row, symbol: normalized })
                    .onConflictDoNothing({ target: instruments.symbol });
                const rows = await this.db
                    .select()
                    .from(instruments)
                    .where(eq(instruments.symbol, normalized));
                return instrumentToDomain(rows[0]!);
            })(),
            (e) => new PersistenceError(e),
        );
    }
}
