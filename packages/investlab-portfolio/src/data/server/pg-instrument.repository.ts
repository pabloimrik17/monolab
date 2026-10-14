import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PLATFORM, type Db } from "@m0n0lab/investlab-platform/server";
import { instrumentToDomain, instrumentToRow } from "./instrument.mapper.ts";
import { instruments } from "./schema.ts";
import type { Instrument } from "../../domain/entities/instrument.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";
import type { PersistenceError } from "@m0n0lab/investlab-core";
import type { ResultAsync } from "neverthrow";

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

    findAll(): ResultAsync<Instrument[], PersistenceError> {
        return this.db
            .select((tx) => tx.select().from(instruments))
            .map((rows) => rows.map(instrumentToDomain));
    }
}
