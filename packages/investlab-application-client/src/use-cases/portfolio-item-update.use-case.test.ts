import { describe, expect, it } from "vitest";
import { NetworkError, PortfolioItem } from "@m0n0lab/investlab-domain";
import { failingPortfolioItemRepo, inMemoryPortfolioItemRepo } from "../testing/in-memory-ports.ts";
import { PortfolioItemUpdateUseCase } from "./portfolio-item-update.use-case.ts";

function seedItem(): PortfolioItem {
    return PortfolioItem.create({
        instrumentId: "instr-1",
        broker: "MyInvestor",
        targetWeight: 10,
    })._unsafeUnwrap();
}

describe("PortfolioItemUpdateUseCase", () => {
    it("applies changes and persists", async () => {
        const item = seedItem();
        const repo = inMemoryPortfolioItemRepo([item]);
        const result = await new PortfolioItemUpdateUseCase(repo).execute(item.id, {
            targetWeight: 25,
        });

        expect(result._unsafeUnwrap().targetWeight).toBe(25);
    });

    it("returns PortfolioItemNotFoundError for unknown id", async () => {
        const result = await new PortfolioItemUpdateUseCase(inMemoryPortfolioItemRepo()).execute(
            "missing",
            { targetWeight: 5 },
        );

        expect(result._unsafeUnwrapErr().code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
    });

    it("returns ValidationError for invalid changes", async () => {
        const item = seedItem();
        const result = await new PortfolioItemUpdateUseCase(
            inMemoryPortfolioItemRepo([item]),
        ).execute(item.id, { targetWeight: -5 });

        expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
    });

    it("propagates NetworkError", async () => {
        const result = await new PortfolioItemUpdateUseCase(
            failingPortfolioItemRepo(new NetworkError("offline")),
        ).execute("x", { targetWeight: 5 });

        expect(result._unsafeUnwrapErr().code).toBe("NETWORK_ERROR");
    });
});
