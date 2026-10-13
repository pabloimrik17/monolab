import { beforeAll, describe, expect, it } from "vitest";
import { TOKENS, type PortfolioItemRepository } from "@m0n0lab/investlab-domain";
import { UNKNOWN_ID, useIntegrationHarness } from "../testing/integration-harness.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { PortfolioItemDeleteUseCase } from "./portfolio-item-delete.use-case.ts";

describe("PortfolioItemDeleteUseCase", () => {
    const harness = useIntegrationHarness();
    let useCase: PortfolioItemDeleteUseCase;
    beforeAll(() => {
        useCase = harness.get(APP_TOKENS.PortfolioItemDeleteUseCase);
    });
    const storedItems = async () =>
        (
            await harness.get<PortfolioItemRepository>(TOKENS.PortfolioItemRepository).findAll()
        )._unsafeUnwrap();

    it("deletes only the given item", async () => {
        const instrument = await harness.seedInstrument();
        const doomed = await harness.seedPortfolioItem({ instrumentId: instrument.id });
        const kept = await harness.seedPortfolioItem({ instrumentId: instrument.id });

        const result = await useCase.execute(doomed.id);

        expect(result.isOk()).toBe(true);
        expect(await storedItems()).toEqual([kept]);
    });

    it("returns PortfolioItemNotFoundError for an unknown id", async () => {
        const result = await useCase.execute(UNKNOWN_ID);

        expect(result._unsafeUnwrapErr().code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
    });
});
