import { describe, expect, it } from "vitest";
import { PortfolioItem } from "../../domain/entities/portfolio-item.ts";
import { portfolioItemToDomain, portfolioItemToRow } from "./portfolio-item.mapper.ts";

describe("PortfolioItemMapper", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const updatedAt = new Date("2026-02-01T00:00:00Z");

    const sampleRow = {
        id: "uuid-1",
        instrumentId: "uuid-instrument-1",
        broker: "MyInvestor",
        targetWeight: "15.00",
        currentValue: "1500.50",
        notes: "DCA monthly",
        createdAt,
        updatedAt,
    };

    describe("portfolioItemToDomain", () => {
        it("maps a full row to a domain entity with numeric strings converted", () => {
            const item = portfolioItemToDomain(sampleRow);
            expect(item.id).toBe("uuid-1");
            expect(item.instrumentId).toBe("uuid-instrument-1");
            expect(item.broker).toBe("MyInvestor");
            expect(item.targetWeight).toBe(15);
            expect(item.currentValue).toBe(1500.5);
            expect(item.notes).toBe("DCA monthly");
            expect(item.createdAt).toEqual(createdAt);
            expect(item.updatedAt).toEqual(updatedAt);
        });

        it("maps null notes to undefined", () => {
            const item = portfolioItemToDomain({ ...sampleRow, notes: null });
            expect(item.notes).toBeUndefined();
        });
    });

    describe("portfolioItemToRow", () => {
        it("maps domain entity to row with numeric strings", () => {
            const item = PortfolioItem.reconstitute({
                id: "uuid-1",
                instrumentId: "uuid-instrument-1",
                broker: "MyInvestor",
                targetWeight: 15,
                currentValue: 1500.5,
                notes: "DCA monthly",
                createdAt,
                updatedAt,
            });
            const row = portfolioItemToRow(item);
            expect(row.id).toBe("uuid-1");
            expect(row.instrumentId).toBe("uuid-instrument-1");
            expect(row.broker).toBe("MyInvestor");
            expect(row.targetWeight).toBe("15");
            expect(row.currentValue).toBe("1500.5");
            expect(row.notes).toBe("DCA monthly");
        });

        it("maps undefined notes to null", () => {
            const item = PortfolioItem.reconstitute({
                id: "uuid-2",
                instrumentId: "uuid-instrument-2",
                broker: "Binance",
                targetWeight: 5,
                currentValue: 0,
                createdAt,
                updatedAt,
            });
            const row = portfolioItemToRow(item);
            expect(row.notes).toBeNull();
        });
    });

    describe("round-trip", () => {
        it("preserves equivalent fields when mapped to row and back", () => {
            const original = PortfolioItem.reconstitute({
                id: "uuid-1",
                instrumentId: "uuid-instrument-1",
                broker: "MyInvestor",
                targetWeight: 15.5,
                currentValue: 1500.75,
                notes: "DCA",
                createdAt,
                updatedAt,
            });
            const row = portfolioItemToRow(original);
            const roundTrip = portfolioItemToDomain({
                id: row.id!,
                instrumentId: row.instrumentId,
                broker: row.broker,
                targetWeight: row.targetWeight as string,
                currentValue: row.currentValue as string,
                notes: row.notes ?? null,
                createdAt: row.createdAt!,
                updatedAt: row.updatedAt!,
            });
            expect(roundTrip.id).toBe(original.id);
            expect(roundTrip.instrumentId).toBe(original.instrumentId);
            expect(roundTrip.broker).toBe(original.broker);
            expect(roundTrip.targetWeight).toBe(original.targetWeight);
            expect(roundTrip.currentValue).toBe(original.currentValue);
            expect(roundTrip.notes).toBe(original.notes);
        });
    });
});
