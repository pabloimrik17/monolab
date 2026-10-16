import { beforeAll, describe, expect, it } from "vitest";
import { useIntegrationHarness, withUnreachableDatabase } from "../testing/integration-harness.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { PortfolioItemListUseCase } from "./portfolio-item-list.use-case.ts";

describe("PortfolioItemListUseCase", () => {
    const harness = useIntegrationHarness();
    let useCase: PortfolioItemListUseCase;
    beforeAll(() => {
        useCase = harness.get(APP_TOKENS.PortfolioItemListUseCase);
    });

    it("returns no items but still lists instruments when the portfolio is empty", async () => {
        const instrument = await harness.seedInstrument();

        const result = await useCase.execute();

        expect(result._unsafeUnwrap()).toEqual({ items: [], instruments: [instrument] });
    });

    it("pairs each item with its instrument, oldest first", async () => {
        const spy = await harness.seedInstrument("SPY");
        const qqq = await harness.seedInstrument("QQQ");
        const unheld = await harness.seedInstrument("VWO");
        const first = await harness.seedPortfolioItem({ instrumentId: qqq.id, targetWeight: 40 });
        const second = await harness.seedPortfolioItem({ instrumentId: spy.id, targetWeight: 60 });

        const result = await useCase.execute();

        const { items, instruments } = result._unsafeUnwrap();
        expect(items).toEqual([
            { item: first, instrument: qqq },
            { item: second, instrument: spy },
        ]);
        expect(instruments).toHaveLength(3);
        expect(instruments).toEqual(expect.arrayContaining([spy, qqq, unheld]));
    });

    it("returns PersistenceError when the database is unreachable", async () => {
        await withUnreachableDatabase<PortfolioItemListUseCase>(
            APP_TOKENS.PortfolioItemListUseCase,
            async (offline) => {
                const result = await offline.execute();

                expect(result._unsafeUnwrapErr().code).toBe("PERSISTENCE_ERROR");
            },
        );
    });
});
