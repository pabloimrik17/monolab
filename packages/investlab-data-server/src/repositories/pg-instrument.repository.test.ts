import { describe, expect, it, vi } from "vitest";
import { Instrument, PersistenceError } from "@m0n0lab/investlab-domain";
import { PgInstrumentRepository } from "./pg-instrument.repository.ts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const row = {
    id: "i-1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    type: "etf",
    assetClass: "equity",
    exchange: null,
    sector: null,
    replicates: null,
    quotable: true,
};

const instrument = Instrument.reconstitute({
    id: "i-1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    type: "etf" as never,
    assetClass: "equity" as never,
    quotable: true,
});

describe("PgInstrumentRepository", () => {
    it("update fails with PersistenceError when no row matched", async () => {
        const returning = vi.fn(() => Promise.resolve([]));
        const db = {
            update: () => ({ set: () => ({ where: () => ({ returning }) }) }),
        } as unknown as NodePgDatabase;

        const result = await new PgInstrumentRepository(db).update(instrument);

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(PersistenceError);
    });

    it("update returns the updated instrument", async () => {
        const db = {
            update: () => ({
                set: () => ({ where: () => ({ returning: () => Promise.resolve([row]) }) }),
            }),
        } as unknown as NodePgDatabase;

        const result = await new PgInstrumentRepository(db).update(instrument);

        expect(result._unsafeUnwrap().id).toBe("i-1");
    });

    it("delete resolves to undefined", async () => {
        const db = {
            delete: () => ({ where: () => Promise.resolve({ rowCount: 1 }) }),
        } as unknown as NodePgDatabase;

        const result = await new PgInstrumentRepository(db).delete("i-1");

        expect(result._unsafeUnwrap()).toBeUndefined();
    });

    it("upsertBySymbol inserts ignoring conflicts, then reads back the row", async () => {
        const onConflictDoNothing = vi.fn(() => Promise.resolve());
        const db = {
            insert: () => ({ values: () => ({ onConflictDoNothing }) }),
            select: () => ({ from: () => ({ where: () => Promise.resolve([row]) }) }),
        } as unknown as NodePgDatabase;

        const result = await new PgInstrumentRepository(db).upsertBySymbol(instrument);

        expect(onConflictDoNothing).toHaveBeenCalledOnce();
        expect(result._unsafeUnwrap().symbol).toBe("VWCE");
    });

    it("upsertBySymbol maps an insert failure to PersistenceError", async () => {
        const cause = new Error("boom");
        const db = {
            insert: () => ({
                values: () => ({ onConflictDoNothing: () => Promise.reject(cause) }),
            }),
        } as unknown as NodePgDatabase;

        const result = await new PgInstrumentRepository(db).upsertBySymbol(instrument);

        const error = result._unsafeUnwrapErr();
        expect(error).toBeInstanceOf(PersistenceError);
        expect(error.cause).toBe(cause);
    });
});
