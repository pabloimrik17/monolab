import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { DATA_TOKENS, portfolioItems } from "@m0n0lab/investlab-data-server";
import { TOKENS, type PortfolioItemRepository } from "@m0n0lab/investlab-domain";
import { UNKNOWN_ID, useIntegrationHarness } from "../testing/integration-harness.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { PortfolioItemUpdateUseCase } from "./portfolio-item-update.use-case.ts";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

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

        const result = await useCase.execute(
            item.id,
            { broker: "Interactive Brokers", targetWeight: 25, currentValue: 500.25 },
            item.updatedAt,
        );

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

        const result = await useCase.execute(item.id, { notes: undefined }, item.updatedAt);

        expect(result._unsafeUnwrap().notes).toBeUndefined();
        expect((await storedItem(item.id))?.notes).toBeUndefined();
    });

    it("returns PortfolioItemNotFoundError for an unknown id", async () => {
        const result = await useCase.execute(UNKNOWN_ID, { targetWeight: 10 }, new Date());

        expect(result._unsafeUnwrapErr().code).toBe("PORTFOLIO_ITEM_NOT_FOUND");
    });

    it("returns ValidationError and keeps the stored item for an invalid update", async () => {
        const instrument = await harness.seedInstrument();
        const item = await harness.seedPortfolioItem({ instrumentId: instrument.id });

        const result = await useCase.execute(item.id, { targetWeight: 500 }, item.updatedAt);

        expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
        expect(await storedItem(item.id)).toEqual(item);
    });

    it("returns PortfolioItemConflictError and keeps the stored item for a stale version", async () => {
        const instrument = await harness.seedInstrument();
        const item = await harness.seedPortfolioItem({ instrumentId: instrument.id });
        const stale = new Date(item.updatedAt.getTime() - 1);

        const result = await useCase.execute(item.id, { targetWeight: 40 }, stale);

        expect(result._unsafeUnwrapErr().code).toBe("PORTFOLIO_ITEM_CONFLICT");
        expect(await storedItem(item.id)).toEqual(item);
    });

    it("lets exactly one of two concurrent updates from the same version win", async () => {
        const instrument = await harness.seedInstrument();
        const item = await harness.seedPortfolioItem({ instrumentId: instrument.id });

        const results = await Promise.all([
            useCase.execute(item.id, { broker: "Broker A", targetWeight: 20 }, item.updatedAt),
            useCase.execute(item.id, { broker: "Broker B", targetWeight: 30 }, item.updatedAt),
        ]);

        const winners = results.filter((result) => result.isOk());
        const losers = results.filter((result) => result.isErr());
        expect(winners).toHaveLength(1);
        expect(losers.map((result) => result._unsafeUnwrapErr().code)).toEqual([
            "PORTFOLIO_ITEM_CONFLICT",
        ]);
        expect(await storedItem(item.id)).toEqual(winners[0]!._unsafeUnwrap());
    });

    it("matches a database-stamped microsecond updated_at against its millisecond read", async () => {
        const instrument = await harness.seedInstrument();
        const seeded = await harness.seedPortfolioItem({ instrumentId: instrument.id });
        await harness
            .get<NodePgDatabase>(DATA_TOKENS.DrizzleDb)
            .update(portfolioItems)
            .set({
                updatedAt: sql`date_trunc('milliseconds', now()) + interval '123 microseconds'`,
            })
            .where(eq(portfolioItems.id, seeded.id));
        const item = (await storedItem(seeded.id))!;

        const result = await useCase.execute(item.id, { targetWeight: 35 }, item.updatedAt);

        expect(result._unsafeUnwrap().targetWeight).toBe(35);
    });
});
