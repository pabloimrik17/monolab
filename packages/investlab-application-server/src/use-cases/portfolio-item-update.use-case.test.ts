import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { PortfolioItem, type PortfolioItemRepository } from "@m0n0lab/investlab-domain";
import { PortfolioItemUpdateUseCase } from "./portfolio-item-update.use-case.ts";

function makeRepo(overrides: Partial<PortfolioItemRepository> = {}): PortfolioItemRepository {
    return {
        save: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        ...overrides,
    };
}

describe("PortfolioItemUpdateUseCase", () => {
    it("updates target weight", async () => {
        const createResult = PortfolioItem.create({
            instrumentId: "instr-1",
            broker: "MyInvestor",
            targetWeight: 10,
        });
        if (!createResult.isOk()) throw new Error("setup");
        const item = createResult.value;

        const repo = makeRepo({
            findById: vi.fn(() => okAsync(item)),
            update: vi.fn((i: PortfolioItem) => okAsync(i)),
        });

        const useCase = new PortfolioItemUpdateUseCase(repo);
        const result = await useCase.execute(item.id, { targetWeight: 25 });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect(result.value.targetWeight).toBe(25);
        }
    });

    it("returns PortfolioItemNotFoundError for unknown id", async () => {
        const repo = makeRepo({
            findById: vi.fn(() => okAsync(null)),
        });

        const useCase = new PortfolioItemUpdateUseCase(repo);
        const result = await useCase.execute("missing", { targetWeight: 10 });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
        }
    });

    it("returns ValidationError for invalid update", async () => {
        const createResult = PortfolioItem.create({
            instrumentId: "instr-1",
            broker: "MyInvestor",
            targetWeight: 10,
        });
        if (!createResult.isOk()) throw new Error("setup");
        const item = createResult.value;

        const repo = makeRepo({
            findById: vi.fn(() => okAsync(item)),
        });

        const useCase = new PortfolioItemUpdateUseCase(repo);
        const result = await useCase.execute(item.id, { targetWeight: 500 });

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
        }
    });
});
