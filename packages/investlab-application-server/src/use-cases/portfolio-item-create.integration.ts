import { beforeAll, describe, expect, it } from "vitest";
import { TOKENS, type PortfolioItemRepository } from "@m0n0lab/investlab-domain";
import {
    UNKNOWN_ID,
    useIntegrationHarness,
    withUnreachableDatabase,
} from "../testing/integration-harness.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { PortfolioItemCreateUseCase } from "./portfolio-item-create.use-case.ts";

describe("PortfolioItemCreateUseCase", () => {
    const harness = useIntegrationHarness();
    let useCase: PortfolioItemCreateUseCase;
    beforeAll(() => {
        useCase = harness.get(APP_TOKENS.PortfolioItemCreateUseCase);
    });
    const storedItems = async () =>
        (
            await harness.get<PortfolioItemRepository>(TOKENS.PortfolioItemRepository).findAll()
        )._unsafeUnwrap();

    it("persists the item when the instrument exists", async () => {
        const instrument = await harness.seedInstrument();

        const result = await useCase.execute({
            instrumentId: instrument.id,
            broker: "  MyInvestor  ",
            targetWeight: 15.5,
            currentValue: 1234.56,
            notes: "core holding",
        });

        const created = result._unsafeUnwrap();
        expect(created).toMatchObject({
            instrumentId: instrument.id,
            broker: "MyInvestor",
            targetWeight: 15.5,
            currentValue: 1234.56,
            notes: "core holding",
        });
        expect(await storedItems()).toEqual([created]);
    });

    it("returns InstrumentNotFoundError when the instrument does not exist", async () => {
        const result = await useCase.execute({
            instrumentId: UNKNOWN_ID,
            broker: "MyInvestor",
            targetWeight: 15,
        });

        expect(result._unsafeUnwrapErr().code).toBe("INSTRUMENT_NOT_FOUND");
        expect(await storedItems()).toEqual([]);
    });

    it("returns ValidationError when the input is invalid", async () => {
        const instrument = await harness.seedInstrument();

        const result = await useCase.execute({
            instrumentId: instrument.id,
            broker: "MyInvestor",
            targetWeight: 150,
        });

        expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
        expect(await storedItems()).toEqual([]);
    });

    it("returns PersistenceError when the database is unreachable", async () => {
        await withUnreachableDatabase<PortfolioItemCreateUseCase>(
            APP_TOKENS.PortfolioItemCreateUseCase,
            async (offline) => {
                const result = await offline.execute({
                    instrumentId: UNKNOWN_ID,
                    broker: "MyInvestor",
                    targetWeight: 10,
                });

                expect(result._unsafeUnwrapErr().code).toBe("PERSISTENCE_ERROR");
            },
        );
    });
});
