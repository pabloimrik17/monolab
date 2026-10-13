import { beforeAll, describe, expect, it } from "vitest";
import { TOKENS, type PortfolioItemRepository } from "@m0n0lab/investlab-domain";
import { UNKNOWN_ID, useIntegrationHarness } from "../testing/integration-harness.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { PortfolioItemUpdateUseCase } from "./portfolio-item-update.use-case.ts";

describe("PortfolioItemUpdateUseCase", () => {
    const harness = useIntegrationHarness();
    let useCase: PortfolioItemUpdateUseCase;
    beforeAll(() => {
        useCase = harness.get(APP_TOKENS.PortfolioItemUpdateUseCase);
    });
    const storedItem = async (id: string) =>
        (
            await harness.get<PortfolioItemRepository>(TOKENS.PortfolioItemRepository).findById(id)
        )._unsafeUnwrap();

    it("persists the changed fields", async () => {
        const instrument = await harness.seedInstrument();
        const item = await harness.seedPortfolioItem({ instrumentId: instrument.id });

        const result = await useCase.execute(item.id, {
            broker: "Interactive Brokers",
            targetWeight: 25,
            currentValue: 500.25,
        });

        const updated = result._unsafeUnwrap();
        expect(updated).toMatchObject({
            id: item.id,
            broker: "Interactive Brokers",
            targetWeight: 25,
            currentValue: 500.25,
        });
        expect(await storedItem(item.id)).toEqual(updated);
    });

    it("clears the notes when they are explicitly undefined", async () => {
        const instrument = await harness.seedInstrument();
        const item = await harness.seedPortfolioItem({
            instrumentId: instrument.id,
            notes: "rebalance yearly",
        });

        const result = await useCase.execute(item.id, { notes: undefined });

        expect(result._unsafeUnwrap().notes).toBeUndefined();
        expect((await storedItem(item.id))?.notes).toBeUndefined();
    });

    it("returns PortfolioItemNotFoundError for an unknown id", async () => {
        const result = await useCase.execute(UNKNOWN_ID, { targetWeight: 10 });

        expect(result._unsafeUnwrapErr().code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
    });

    it("returns ValidationError and keeps the stored item for an invalid update", async () => {
        const instrument = await harness.seedInstrument();
        const item = await harness.seedPortfolioItem({ instrumentId: instrument.id });

        const result = await useCase.execute(item.id, { targetWeight: 500 });

        expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
        expect(await storedItem(item.id)).toEqual(item);
    });
});
