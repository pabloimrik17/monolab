import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { err, ok, type ResultAsync } from "neverthrow";
import { PersistenceError } from "@m0n0lab/investlab-core";
import { PLATFORM, type Db } from "@m0n0lab/investlab-platform/server";
import { InstrumentAlreadyExistsError, InstrumentInUseError } from "../../domain/errors.ts";
import { instrumentToDomain, instrumentToRow } from "./instrument.mapper.ts";
import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, violates } from "./pg-violation.ts";
import { instruments } from "./schema.ts";
import type { Instrument } from "../../domain/entities/instrument.ts";
import type { InstrumentRepository } from "../../domain/ports/instrument.repository.ts";

/** The unique symbol constraint is the authority on duplicates, so no read-then-write race. */
function symbolTaken(instrument: Instrument) {
    return (error: PersistenceError): PersistenceError | InstrumentAlreadyExistsError =>
        violates(error, UNIQUE_VIOLATION)
            ? new InstrumentAlreadyExistsError(instrument.symbol)
            : error;
}

@injectable()
export class PgInstrumentRepository implements InstrumentRepository {
    constructor(@inject(PLATFORM.Db) private readonly db: Db) {}

    save(
        instrument: Instrument,
    ): ResultAsync<Instrument, PersistenceError | InstrumentAlreadyExistsError> {
        return this.db
            .insert((tx) => tx.insert(instruments).values(instrumentToRow(instrument)).returning())
            .map((rows) => instrumentToDomain(rows[0]!))
            .mapErr(symbolTaken(instrument));
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

    update(
        instrument: Instrument,
    ): ResultAsync<Instrument, PersistenceError | InstrumentAlreadyExistsError> {
        return this.db
            .update((tx) =>
                tx
                    .update(instruments)
                    .set(instrumentToRow(instrument))
                    .where(eq(instruments.id, instrument.id))
                    .returning(),
            )
            .mapErr(symbolTaken(instrument))
            .andThen((rows) =>
                rows.length === 0
                    ? err(new PersistenceError(`Instrument not found: ${instrument.id}`))
                    : ok(instrumentToDomain(rows[0]!)),
            );
    }

    /** The portfolio items' foreign key backs up the use case's in-use check against a race. */
    delete(id: string): ResultAsync<void, PersistenceError | InstrumentInUseError> {
        return this.db
            .delete((tx) => tx.delete(instruments).where(eq(instruments.id, id)))
            .map(() => undefined)
            .mapErr((error) =>
                violates(error, FOREIGN_KEY_VIOLATION) ? new InstrumentInUseError(id) : error,
            );
    }
}
