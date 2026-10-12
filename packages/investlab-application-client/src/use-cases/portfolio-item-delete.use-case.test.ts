import { describe, expect, it } from "vitest";
import { NetworkError, PortfolioItem } from "@m0n0lab/investlab-domain";
import { failingPortfolioItemRepo, inMemoryPortfolioItemRepo } from "../testing/in-memory-ports.ts";
import { PortfolioItemDeleteUseCase } from "./portfolio-item-delete.use-case.ts";

describe("PortfolioItemDeleteUseCase", () => {
    it("removes the item", async () => {
        const item = PortfolioItem.create({
            instrumentId: "instr-1",
            broker: "MyInvestor",
            targetWeight: 10,
        })._unsafeUnwrap();
        const repo = inMemoryPortfolioItemRepo([item]);

        const result = await new PortfolioItemDeleteUseCase(repo).execute(item.id);

        expect(result.isOk()).toBe(true);
        expect((await repo.findById(item.id))._unsafeUnwrap()).toBeNull();
    });

    it("propagates NetworkError", async () => {
        const result = await new PortfolioItemDeleteUseCase(
            failingPortfolioItemRepo(new NetworkError("offline")),
        ).execute("x");

        expect(result._unsafeUnwrapErr().code).toBe("NETWORK_ERROR");
    });
});
