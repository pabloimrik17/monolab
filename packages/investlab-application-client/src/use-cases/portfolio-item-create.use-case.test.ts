import { describe, expect, it } from "vitest";
import { NetworkError } from "@m0n0lab/investlab-domain";
import { failingPortfolioItemRepo, inMemoryPortfolioItemRepo } from "../testing/in-memory-ports.ts";
import { PortfolioItemCreateUseCase } from "./portfolio-item-create.use-case.ts";

const props = { instrumentId: "instr-1", broker: "MyInvestor", targetWeight: 10 };

describe("PortfolioItemCreateUseCase", () => {
    it("persists a valid item", async () => {
        const repo = inMemoryPortfolioItemRepo();
        const result = await new PortfolioItemCreateUseCase(repo).execute(props);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
            expect((await repo.findById(result.value.id))._unsafeUnwrap()).toBe(result.value);
        }
    });

    it("returns ValidationError without touching the repo", async () => {
        const repo = inMemoryPortfolioItemRepo();
        const result = await new PortfolioItemCreateUseCase(repo).execute({
            ...props,
            targetWeight: -1,
        });

        expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
        expect((await repo.findAll())._unsafeUnwrap()).toHaveLength(0);
    });

    it("propagates NetworkError", async () => {
        const repo = failingPortfolioItemRepo(new NetworkError("offline"));
        const result = await new PortfolioItemCreateUseCase(repo).execute(props);

        expect(result._unsafeUnwrapErr().code).toBe("NETWORK_ERROR");
    });
});
