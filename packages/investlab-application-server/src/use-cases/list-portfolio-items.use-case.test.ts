import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import {
    AssetClass,
    Instrument,
    InstrumentType,
    PortfolioItem,
    type InstrumentRepository,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";
import { ListPortfolioItemsUseCase } from "./list-portfolio-items.use-case.ts";

function makeInstrumentRepo(overrides: Partial<InstrumentRepository> = {}): InstrumentRepository {
    return {
        save: vi.fn(),
        findById: vi.fn(),
        findBySymbol: vi.fn(),
        findAll: vi.fn(),
        findByType: vi.fn(),
        findByAssetClass: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsertBySymbol: vi.fn(),
        ...overrides,
    };
}

function makePortfolioItemRepo(
    overrides: Partial<PortfolioItemRepository> = {},
): PortfolioItemRepository {
    return {
        save: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        findByInstrumentId: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        ...overrides,
    };
}

describe("ListPortfolioItemsUseCase", () => {
    it("returns empty array when no items", async () => {
        const portfolioRepo = makePortfolioItemRepo({
            findAll: vi.fn(() => okAsync([])),
        });
        const instrumentRepo = makeInstrumentRepo();

        const useCase = new ListPortfolioItemsUseCase(portfolioRepo, instrumentRepo);
        const result = await useCase.execute();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toEqual([]);
        }
        expect(instrumentRepo.findAll).not.toHaveBeenCalled();
    });

    it("returns items joined with their instrument", async () => {
        const instrumentResult = Instrument.create({
            symbol: "SPY",
            name: "SPDR",
            type: InstrumentType.ETF,
            assetClass: AssetClass.Equity,
        });
        if (!instrumentResult.isOk()) throw new Error("setup");
        const instrument = instrumentResult.value;

        const itemResult = PortfolioItem.create({
            instrumentId: instrument.id,
            broker: "MyInvestor",
            targetWeight: 20,
        });
        if (!itemResult.isOk()) throw new Error("setup");
        const item = itemResult.value;

        const portfolioRepo = makePortfolioItemRepo({
            findAll: vi.fn(() => okAsync([item])),
        });
        const instrumentRepo = makeInstrumentRepo({
            findAll: vi.fn(() => okAsync([instrument])),
        });

        const useCase = new ListPortfolioItemsUseCase(portfolioRepo, instrumentRepo);
        const result = await useCase.execute();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toHaveLength(1);
            expect(result.value[0]!.item.id).toBe(item.id);
            expect(result.value[0]!.instrument.symbol).toBe("SPY");
        }
    });

    it("filters out items whose instrument was not found", async () => {
        const itemResult = PortfolioItem.create({
            instrumentId: "missing-instrument",
            broker: "MyInvestor",
            targetWeight: 20,
        });
        if (!itemResult.isOk()) throw new Error("setup");

        const portfolioRepo = makePortfolioItemRepo({
            findAll: vi.fn(() => okAsync([itemResult.value])),
        });
        const instrumentRepo = makeInstrumentRepo({
            findAll: vi.fn(() => okAsync([])),
        });

        const useCase = new ListPortfolioItemsUseCase(portfolioRepo, instrumentRepo);
        const result = await useCase.execute();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value).toEqual([]);
        }
    });
});
