import { describe, expect, it } from "vitest";
import { AssetClass } from "../value-objects/asset-class.ts";
import { InstrumentType } from "../value-objects/instrument-type.ts";
import { Sector } from "../value-objects/sector.ts";
import { Instrument } from "./instrument.ts";

describe("Instrument", () => {
    describe("create", () => {
        it("creates with required fields and defaults", () => {
            const result = Instrument.create({
                symbol: "AAPL",
                name: "Apple Inc",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const i = result.value;
                expect(i.symbol).toBe("AAPL");
                expect(i.name).toBe("Apple Inc");
                expect(i.type).toBe(InstrumentType.Stock);
                expect(i.assetClass).toBe(AssetClass.Equity);
                expect(i.quotable).toBe(true);
                expect(i.exchange).toBeUndefined();
                expect(i.sector).toBeUndefined();
                expect(i.replicates).toBeUndefined();
                expect(i.id).toBeDefined();
            }
        });

        it("creates with all optional fields", () => {
            const result = Instrument.create({
                symbol: "AAPL",
                name: "Apple Inc",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
                exchange: "NASDAQ",
                sector: Sector.Technology,
                replicates: "S&P 500",
                quotable: false,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.exchange).toBe("NASDAQ");
                expect(result.value.sector).toBe(Sector.Technology);
                expect(result.value.replicates).toBe("S&P 500");
                expect(result.value.quotable).toBe(false);
            }
        });

        it("normalizes symbol to trimmed uppercase", () => {
            const result = Instrument.create({
                symbol: "  aapl  ",
                name: "Apple",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.symbol).toBe("AAPL");
            }
        });

        it("trims the name", () => {
            const result = Instrument.create({
                symbol: "AAPL",
                name: "  Apple Inc  ",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.name).toBe("Apple Inc");
            }
        });

        it("returns ValidationError for empty symbol", () => {
            const result = Instrument.create({
                symbol: "   ",
                name: "Apple",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            });
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it("returns ValidationError for empty name", () => {
            const result = Instrument.create({
                symbol: "AAPL",
                name: "",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            });
            expect(result.isErr()).toBe(true);
            if (result.isErr()) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it("creates ETF without exchange or sector", () => {
            const result = Instrument.create({
                symbol: "SPY",
                name: "SPDR S&P 500 ETF",
                type: InstrumentType.ETF,
                assetClass: AssetClass.Equity,
                replicates: "S&P 500",
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.exchange).toBeUndefined();
                expect(result.value.sector).toBeUndefined();
                expect(result.value.replicates).toBe("S&P 500");
            }
        });
    });

    describe("update", () => {
        it("updates name", () => {
            const result = Instrument.create({
                symbol: "AAPL",
                name: "Apple",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const updateResult = result.value.update({ name: "Apple Inc" });
                expect(updateResult.isOk()).toBe(true);
                expect(result.value.name).toBe("Apple Inc");
            }
        });

        it("updates type and assetClass", () => {
            const result = Instrument.create({
                symbol: "BTC",
                name: "Bitcoin",
                type: InstrumentType.Crypto,
                assetClass: AssetClass.Crypto,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                result.value.update({
                    type: InstrumentType.Stock,
                    assetClass: AssetClass.Equity,
                });
                expect(result.value.type).toBe(InstrumentType.Stock);
                expect(result.value.assetClass).toBe(AssetClass.Equity);
            }
        });

        it("updates optional fields", () => {
            const result = Instrument.create({
                symbol: "AAPL",
                name: "Apple",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                result.value.update({
                    exchange: "NASDAQ",
                    sector: Sector.Technology,
                    quotable: false,
                });
                expect(result.value.exchange).toBe("NASDAQ");
                expect(result.value.sector).toBe(Sector.Technology);
                expect(result.value.quotable).toBe(false);
            }
        });

        it("returns ValidationError for empty name update", () => {
            const result = Instrument.create({
                symbol: "AAPL",
                name: "Apple",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                const updateResult = result.value.update({ name: "  " });
                expect(updateResult.isErr()).toBe(true);
                if (updateResult.isErr()) {
                    expect(updateResult.error.code).toBe("VALIDATION_ERROR");
                }
            }
        });

        it("partially updates only provided fields", () => {
            const result = Instrument.create({
                symbol: "AAPL",
                name: "Apple",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
                quotable: true,
            });
            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                result.value.update({ quotable: false });
                expect(result.value.name).toBe("Apple");
                expect(result.value.type).toBe(InstrumentType.Stock);
                expect(result.value.quotable).toBe(false);
            }
        });
    });

    describe("reconstitute", () => {
        it("hydrates from raw props without validation", () => {
            const item = Instrument.reconstitute({
                id: "uuid-1",
                symbol: "AAPL",
                name: "Apple Inc",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
                exchange: "NASDAQ",
                sector: Sector.Technology,
                quotable: true,
            });
            expect(item.id).toBe("uuid-1");
            expect(item.symbol).toBe("AAPL");
            expect(item.exchange).toBe("NASDAQ");
        });
    });
});
