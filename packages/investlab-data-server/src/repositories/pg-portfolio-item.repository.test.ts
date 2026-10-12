import { describe, expect, it } from "vitest";
import { PersistenceError, PortfolioItem } from "@m0n0lab/investlab-domain";
import { PgPortfolioItemRepository } from "./pg-portfolio-item.repository.ts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const row = {
    id: "p-1",
    instrumentId: "i-1",
    broker: "MyInvestor",
    targetWeight: "15.00",
    currentValue: "1500.50",
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
};

const item = PortfolioItem.reconstitute({
    id: "p-1",
    instrumentId: "i-1",
    broker: "MyInvestor",
    targetWeight: 15,
    currentValue: 1500.5,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

describe("PgPortfolioItemRepository", () => {
    it("update fails with PersistenceError when no row matched", async () => {
        const db = {
            update: () => ({
                set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }),
            }),
        } as unknown as NodePgDatabase;

        const result = await new PgPortfolioItemRepository(db).update(item);

        expect(result._unsafeUnwrapErr()).toBeInstanceOf(PersistenceError);
    });

    it("update returns the updated item", async () => {
        const db = {
            update: () => ({
                set: () => ({ where: () => ({ returning: () => Promise.resolve([row]) }) }),
            }),
        } as unknown as NodePgDatabase;

        const result = await new PgPortfolioItemRepository(db).update(item);

        expect(result._unsafeUnwrap().id).toBe("p-1");
    });

    it("delete resolves to undefined", async () => {
        const db = {
            delete: () => ({ where: () => Promise.resolve({ rowCount: 1 }) }),
        } as unknown as NodePgDatabase;

        const result = await new PgPortfolioItemRepository(db).delete("p-1");

        expect(result._unsafeUnwrap()).toBeUndefined();
    });

    it("findById returns null when no row matched", async () => {
        const db = {
            select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
        } as unknown as NodePgDatabase;

        const result = await new PgPortfolioItemRepository(db).findById("p-1");

        expect(result._unsafeUnwrap()).toBeNull();
    });
});
