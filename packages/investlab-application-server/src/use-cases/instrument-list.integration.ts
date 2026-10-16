import { beforeAll, describe, expect, it } from "vitest";
import { useIntegrationHarness, withUnreachableDatabase } from "../testing/integration-harness.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { InstrumentListUseCase } from "./instrument-list.use-case.ts";

describe("InstrumentListUseCase", () => {
    const harness = useIntegrationHarness();
    let useCase: InstrumentListUseCase;
    beforeAll(() => {
        useCase = harness.get(APP_TOKENS.InstrumentListUseCase);
    });

    it("returns the instrument catalog", async () => {
        const spy = await harness.seedInstrument("SPY");
        const qqq = await harness.seedInstrument("QQQ");

        const result = await useCase.execute();

        const catalog = result._unsafeUnwrap();
        expect(catalog).toHaveLength(2);
        expect(catalog).toEqual(expect.arrayContaining([spy, qqq]));
    });

    it("returns an empty catalog when no instrument exists", async () => {
        const result = await useCase.execute();

        expect(result._unsafeUnwrap()).toEqual([]);
    });

    it("returns PersistenceError when the database is unreachable", async () => {
        await withUnreachableDatabase<InstrumentListUseCase>(
            APP_TOKENS.InstrumentListUseCase,
            async (offline) => {
                const result = await offline.execute();

                expect(result._unsafeUnwrapErr().code).toBe("PERSISTENCE_ERROR");
            },
        );
    });
});
