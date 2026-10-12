import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import {
    AssetClass,
    Instrument,
    InstrumentType,
    PersistenceError,
    type InstrumentRepository,
    type PortfolioItem,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";
import { PortfolioItemCreateUseCase } from "./portfolio-item-create.use-case.ts";

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

describe("PortfolioItemCreateUseCase", () => {
    it("creates and persists when instrument exists", async () => {
        const instrumentResult = Instrument.create({
            symbol: "SPY",
            name: "SPDR S&P 500 ETF",
            type: InstrumentType.ETF,
            assetClass: AssetClass.Equity,
        });
        if (!instrumentResult.isOk()) throw new Error("setup");
        const instrument = instrumentResult.value;

        const instrumentRepo = makeInstrumentRepo({
            findById: vi.fn(() => okAsync(instrument)),
        });
        const portfolioItemRepo = makePortfolioItemRepo({
            save: vi.fn((item: PortfolioItem) => okAsync(item)),
        });

        const useCase = new PortfolioItemCreateUseCase(instrumentRepo, portfolioItemRepo);
        const result = await useCase.execute({
            instrumentId: instrument.id,
            broker: "MyInvestor",
            targetWeight: 15,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.broker).toBe("MyInvestor");
            expect(result.value.targetWeight).toBe(15);
            expect(portfolioItemRepo.save).toHaveBeenCalled();
        }
    });

    it("returns InstrumentNotFoundError when instrument missing", async () => {
        const instrumentRepo = makeInstrumentRepo({
            findById: vi.fn(() => okAsync(null)),
        });
        const portfolioItemRepo = makePortfolioItemRepo();

        const useCase = new PortfolioItemCreateUseCase(instrumentRepo, portfolioItemRepo);
        const result = await useCase.execute({
            instrumentId: "missing-id",
            broker: "MyInvestor",
            targetWeight: 15,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("INSTRUMENT_NOT_FOUND");
        }
        expect(portfolioItemRepo.save).not.toHaveBeenCalled();
    });

    it("returns ValidationError when input invalid", async () => {
        const instrumentResult = Instrument.create({
            symbol: "SPY",
            name: "SPDR",
            type: InstrumentType.ETF,
            assetClass: AssetClass.Equity,
        });
        if (!instrumentResult.isOk()) throw new Error("setup");

        const instrumentRepo = makeInstrumentRepo({
            findById: vi.fn(() => okAsync(instrumentResult.value)),
        });
        const portfolioItemRepo = makePortfolioItemRepo();

        const useCase = new PortfolioItemCreateUseCase(instrumentRepo, portfolioItemRepo);
        const result = await useCase.execute({
            instrumentId: instrumentResult.value.id,
            broker: "MyInvestor",
            targetWeight: 150,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
        }
    });

    it("propagates persistence errors from instrument lookup", async () => {
        const instrumentRepo = makeInstrumentRepo({
            findById: vi.fn(() => errAsync(new PersistenceError("boom"))),
        });
        const portfolioItemRepo = makePortfolioItemRepo();

        const useCase = new PortfolioItemCreateUseCase(instrumentRepo, portfolioItemRepo);
        const result = await useCase.execute({
            instrumentId: "any",
            broker: "MyInvestor",
            targetWeight: 10,
        });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("PERSISTENCE_ERROR");
        }
    });
});
