import { describe, expect, it } from "vitest";
import { PortfolioItem } from "./portfolio-item.ts";

const validInstrumentId = "00000000-0000-0000-0000-000000000001";

describe("PortfolioItem", () => {
    describe("create", () => {
        it("creates with valid props and default currentValue=0, notes=undefined", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: 15,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const item = result.value;
                expect(item.instrumentId).toBe(validInstrumentId);
                expect(item.broker).toBe("MyInvestor");
                expect(item.targetWeight).toBe(15);
                expect(item.currentValue).toBe(0);
                expect(item.notes).toBeUndefined();
                expect(item.id).toBeDefined();
                expect(item.createdAt).toBeInstanceOf(Date);
                expect(item.updatedAt).toBeInstanceOf(Date);
            }
        });

        it("creates with currentValue and notes", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "Binance",
                targetWeight: 10,
                currentValue: 1500.5,
                notes: "DCA monthly",
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.currentValue).toBe(1500.5);
                expect(result.value.notes).toBe("DCA monthly");
            }
        });

        it("returns ValidationError for targetWeight < 0", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: -5,
            });
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it.each([
            ["targetWeight", { targetWeight: Number.NaN }],
            ["currentValue", { targetWeight: 10, currentValue: Number.NaN }],
        ])("returns ValidationError for NaN %s", (_field, numbers) => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                ...numbers,
            });
            expect(result.isErr()).toBe(true);
        });

        it("returns ValidationError for targetWeight > 100", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: 150,
            });
            expect(result.isErr()).toBe(true);
        });

        it("returns ValidationError for empty broker", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "   ",
                targetWeight: 10,
            });
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it("returns ValidationError for empty instrumentId", () => {
            const result = PortfolioItem.create({
                instrumentId: "  ",
                broker: "MyInvestor",
                targetWeight: 10,
            });
            expect(result.isErr()).toBe(true);
        });

        it("returns ValidationError for negative currentValue", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: 10,
                currentValue: -100,
            });
            expect(result.isErr()).toBe(true);
        });
    });

    describe("update", () => {
        it("updates mutable fields", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: 10,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const item = result.value;
                const updateResult = item.update({
                    broker: "Binance",
                    targetWeight: 25,
                    currentValue: 500,
                    notes: "updated",
                });
                expect(updateResult.isOk()).toBe(true);
                expect(item.broker).toBe("Binance");
                expect(item.targetWeight).toBe(25);
                expect(item.currentValue).toBe(500);
                expect(item.notes).toBe("updated");
            }
        });

        it("rejects invalid targetWeight", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: 10,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const updateResult = result.value.update({ targetWeight: 200 });
                expect(updateResult.isErr()).toBe(true);
            }
        });

        it("rejects empty broker", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: 10,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const updateResult = result.value.update({ broker: "  " });
                expect(updateResult.isErr()).toBe(true);
            }
        });

        it.each([
            ["targetWeight", { targetWeight: Number.NaN }],
            ["currentValue", { currentValue: Number.NaN }],
        ])("rejects NaN %s", (_field, changes) => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: 10,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.update(changes).isErr()).toBe(true);
                expect(result.value.targetWeight).toBe(10);
            }
        });

        it("rejects negative currentValue", () => {
            const result = PortfolioItem.create({
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: 10,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const updateResult = result.value.update({ currentValue: -1 });
                expect(updateResult.isErr()).toBe(true);
            }
        });
    });

    describe("reconstitute", () => {
        it("hydrates from raw props without validation", () => {
            const createdAt = new Date("2026-01-01");
            const updatedAt = new Date("2026-02-01");
            const item = PortfolioItem.reconstitute({
                id: "uuid-1",
                instrumentId: validInstrumentId,
                broker: "MyInvestor",
                targetWeight: 15,
                currentValue: 1000,
                notes: "note",
                createdAt,
                updatedAt,
            });
            expect(item.id).toBe("uuid-1");
            expect(item.broker).toBe("MyInvestor");
            expect(item.createdAt).toEqual(createdAt);
            expect(item.updatedAt).toEqual(updatedAt);
        });
    });
});
