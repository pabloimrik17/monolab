import { okAsync } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { PortfolioItem, type PortfolioItemRepository } from "@m0n0lab/investlab-domain";
import { DeletePortfolioItemUseCase } from "./delete-portfolio-item.use-case.ts";

function makeRepo(overrides: Partial<PortfolioItemRepository> = {}): PortfolioItemRepository {
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

describe("DeletePortfolioItemUseCase", () => {
    it("deletes existing item", async () => {
        const createResult = PortfolioItem.create({
            instrumentId: "instr-1",
            broker: "MyInvestor",
            targetWeight: 10,
        });
        if (!createResult.isOk()) throw new Error("setup");
        const item = createResult.value;

        const repo = makeRepo({
            findById: vi.fn(() => okAsync(item)),
            delete: vi.fn(() => okAsync(undefined)),
        });

        const useCase = new DeletePortfolioItemUseCase(repo);
        const result = await useCase.execute(item.id);

        expect(result.isOk()).toBe(true);
        expect(repo.delete).toHaveBeenCalledWith(item.id);
    });

    it("returns PortfolioItemNotFoundError for unknown id", async () => {
        const repo = makeRepo({
            findById: vi.fn(() => okAsync(null)),
        });

        const useCase = new DeletePortfolioItemUseCase(repo);
        const result = await useCase.execute("missing");

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
            expect(result.error.code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
        }
        expect(repo.delete).not.toHaveBeenCalled();
    });
});
