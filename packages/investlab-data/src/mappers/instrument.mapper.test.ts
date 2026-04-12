import { describe, expect, it } from "vitest";
import { AssetClass, Instrument, InstrumentType, Sector } from "@m0n0lab/investlab-domain";
import { instrumentToDomain, instrumentToRow } from "./instrument.mapper.ts";

describe("InstrumentMapper", () => {
    const sampleRow = {
        id: "uuid-1",
        symbol: "AAPL",
        name: "Apple Inc",
        type: "stock",
        assetClass: "equity",
        exchange: "NASDAQ",
        sector: "technology",
        replicates: null,
        quotable: true,
    };

    describe("instrumentToDomain", () => {
        it("maps a full row to domain entity", () => {
            const instrument = instrumentToDomain(sampleRow);
            expect(instrument.id).toBe("uuid-1");
            expect(instrument.symbol).toBe("AAPL");
            expect(instrument.name).toBe("Apple Inc");
            expect(instrument.type).toBe(InstrumentType.Stock);
            expect(instrument.assetClass).toBe(AssetClass.Equity);
            expect(instrument.exchange).toBe("NASDAQ");
            expect(instrument.sector).toBe(Sector.Technology);
            expect(instrument.replicates).toBeUndefined();
            expect(instrument.quotable).toBe(true);
        });

        it("maps null optional fields to undefined", () => {
            const row = { ...sampleRow, exchange: null, sector: null };
            const instrument = instrumentToDomain(row);
            expect(instrument.exchange).toBeUndefined();
            expect(instrument.sector).toBeUndefined();
        });
    });

    describe("instrumentToRow", () => {
        it("maps domain entity to row", () => {
            const instrument = Instrument.reconstitute({
                id: "uuid-1",
                symbol: "AAPL",
                name: "Apple Inc",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
                exchange: "NASDAQ",
                sector: Sector.Technology,
                quotable: true,
            });

            const row = instrumentToRow(instrument);
            expect(row.id).toBe("uuid-1");
            expect(row.symbol).toBe("AAPL");
            expect(row.name).toBe("Apple Inc");
            expect(row.type).toBe("stock");
            expect(row.assetClass).toBe("equity");
            expect(row.exchange).toBe("NASDAQ");
            expect(row.sector).toBe("technology");
            expect(row.replicates).toBeNull();
            expect(row.quotable).toBe(true);
        });

        it("maps undefined optional fields to null", () => {
            const instrument = Instrument.reconstitute({
                id: "uuid-2",
                symbol: "BTC",
                name: "Bitcoin",
                type: InstrumentType.Crypto,
                assetClass: AssetClass.Crypto,
                quotable: true,
            });

            const row = instrumentToRow(instrument);
            expect(row.exchange).toBeNull();
            expect(row.sector).toBeNull();
            expect(row.replicates).toBeNull();
        });
    });
});
