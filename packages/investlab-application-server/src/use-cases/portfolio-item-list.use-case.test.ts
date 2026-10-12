import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import {
    AssetClass,
    Instrument,
    InstrumentType,
    PersistenceError,
    PortfolioItem,
    type InstrumentRepository,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";
import { PortfolioItemListUseCase } from "./portfolio-item-list.use-case.ts";

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

function makeInstrument(): Instrument {
    const result = Instrument.create({
        symbol: "SPY",
        name: "SPDR",
        type: InstrumentType.ETF,
        assetClass: AssetClass.Equity,
    });
    if (!result.isOk()) throw new Error("setup");
    return result.value;
}

describe("PortfolioItemListUseCase", () => {
    it("returns no items but still lists instruments when portfolio is empty", async () => {
        const instrument = makeInstrument();
        const portfolioRepo = makePortfolioItemRepo({
            findAll: vi.fn(() => okAsync([])),
        });
        const instrumentRepo = makeInstrumentRepo({
            findAll: vi.fn(() => okAsync([instrument])),
        });

        const useCase = new PortfolioItemListUseCase(portfolioRepo, instrumentRepo);
        const result = await useCase.execute();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.items).toEqual([]);
            expect(result.value.instruments).toEqual([instrument]);
        }
    });

    it("returns items joined with their instrument", async () => {
        const instrument = makeInstrument();

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

        const useCase = new PortfolioItemListUseCase(portfolioRepo, instrumentRepo);
        const result = await useCase.execute();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.items).toHaveLength(1);
            expect(result.value.items[0]!.item.id).toBe(item.id);
            expect(result.value.items[0]!.instrument.symbol).toBe("SPY");
            expect(result.value.instruments).toEqual([instrument]);
        }
        expect(instrumentRepo.findAll).toHaveBeenCalledTimes(1);
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

        const useCase = new PortfolioItemListUseCase(portfolioRepo, instrumentRepo);
        const result = await useCase.execute();

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.items).toEqual([]);
        }
    });

    it("propagates an instrument lookup failure", async () => {
        const failure = new PersistenceError(new Error("connection lost"));
        const portfolioRepo = makePortfolioItemRepo({
            findAll: vi.fn(() => okAsync([])),
        });
        const instrumentRepo = makeInstrumentRepo({
            findAll: vi.fn(() => errAsync(failure)),
        });

        const useCase = new PortfolioItemListUseCase(portfolioRepo, instrumentRepo);
        const result = await useCase.execute();

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error).toBe(failure);
        }
    });
});
