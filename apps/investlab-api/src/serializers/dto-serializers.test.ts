import { describe, expect, it } from "vitest";
import {
    AssetClass,
    Instrument,
    instrumentDtoSchema,
    InstrumentType,
    PortfolioItem,
    portfolioItemDtoSchema,
    Sector,
} from "@m0n0lab/investlab-portfolio";
import { toInstrumentDto, toPortfolioItemDto } from "./dto-serializers.ts";

describe("toInstrumentDto", () => {
    it("carries the optional fields when present", () => {
        const created = Instrument.create({
            symbol: "AAPL",
            name: "Apple",
            type: InstrumentType.Stock,
            assetClass: AssetClass.Equity,
            exchange: "NASDAQ",
            sector: Sector.Technology,
            replicates: "nothing",
            quotable: false,
        });
        if (created.isErr()) throw created.error;

        const dto = toInstrumentDto(created.value);

        expect(instrumentDtoSchema.parse(dto)).toEqual(dto);
        expect(dto).toMatchObject({
            exchange: "NASDAQ",
            sector: "technology",
            replicates: "nothing",
            quotable: false,
        });
    });
});

describe("toPortfolioItemDto", () => {
    it("serializes dates as ISO strings and omits absent notes", () => {
        const created = PortfolioItem.create({
            instrumentId: crypto.randomUUID(),
            broker: "MyInvestor",
            targetWeight: 10,
        });
        if (created.isErr()) throw created.error;

        const dto = toPortfolioItemDto(created.value);

        expect(portfolioItemDtoSchema.parse(dto)).toEqual(dto);
        expect(dto.createdAt).toBe(created.value.createdAt.toISOString());
        expect("notes" in dto).toBe(false);
    });
});
