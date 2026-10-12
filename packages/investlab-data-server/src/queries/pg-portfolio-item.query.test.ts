import { describe, expect, it, vi } from "vitest";
import { Instrument, PersistenceError, PortfolioItem } from "@m0n0lab/investlab-domain";
import { PgPortfolioItemQuery } from "./pg-portfolio-item.query.ts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const instrumentRow = {
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

const itemRow = {
    id: "p-1",
    instrumentId: "i-1",
    broker: "MyInvestor",
    targetWeight: "15.00",
    currentValue: "1500.50",
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
};

/** Drizzle builders are chainable and thenable; the last link settles with `outcome`. */
function fakeDb(outcome: Promise<unknown>) {
    const orderBy = vi.fn(() => outcome);
    const innerJoin = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ innerJoin }));
    const select = vi.fn(() => ({ from }));
    return { db: { select } as unknown as NodePgDatabase, select, from, innerJoin, orderBy };
}

describe("PgPortfolioItemQuery", () => {
    it("pairs each item with its instrument from one joined select", async () => {
        const { db, select, innerJoin } = fakeDb(
            Promise.resolve([{ item: itemRow, instrument: instrumentRow }]),
        );

        const result = await new PgPortfolioItemQuery(db).listWithInstruments();

        const rows = result._unsafeUnwrap();
        expect(rows).toHaveLength(1);
        expect(rows[0]!.item).toBeInstanceOf(PortfolioItem);
        expect(rows[0]!.item.id).toBe("p-1");
        expect(rows[0]!.item.targetWeight).toBe(15);
        expect(rows[0]!.instrument).toBeInstanceOf(Instrument);
        expect(rows[0]!.instrument.symbol).toBe("VWCE");
        expect(select).toHaveBeenCalledOnce();
        expect(innerJoin).toHaveBeenCalledOnce();
    });

    it("orders by item creation date ascending", async () => {
        const { db, orderBy } = fakeDb(Promise.resolve([]));

        await new PgPortfolioItemQuery(db).listWithInstruments();

        expect(orderBy).toHaveBeenCalledOnce();
    });

    it("returns an empty list when there are no items", async () => {
        const { db } = fakeDb(Promise.resolve([]));

        const result = await new PgPortfolioItemQuery(db).listWithInstruments();

        expect(result._unsafeUnwrap()).toEqual([]);
    });

    it("maps a database failure to PersistenceError", async () => {
        const cause = new Error("connection lost");
        const { db } = fakeDb(Promise.reject(cause));

        const result = await new PgPortfolioItemQuery(db).listWithInstruments();

        const error = result._unsafeUnwrapErr();
        expect(error).toBeInstanceOf(PersistenceError);
        expect(error.cause).toBe(cause);
    });
});
