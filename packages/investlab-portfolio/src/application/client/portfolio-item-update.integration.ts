import { beforeEach, describe, expect, it } from "vitest";
import { NetworkError, ValidationError } from "@m0n0lab/investlab-core";
import { PortfolioItemConflictError, PortfolioItemNotFoundError } from "../../domain/errors.ts";
import {
    givenApiUnavailable,
    givenChangedMeanwhile,
    givenPortfolioWith,
    holdingOf,
    UNKNOWN_ID,
    VWCE,
} from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { PortfolioItemUpdateUseCase } from "./portfolio-item-update.use-case.ts";

/** The version every `holdingOf` holding carries: what the web last read. */
const READ_VERSION = new Date("2026-10-02T11:30:00.000Z");

let update: PortfolioItemUpdateUseCase;
beforeEach(() => {
    update = container.get(PORTFOLIO.ItemUpdate);
});

describe("changing a holding", () => {
    it("returns the holding with the change and everything else kept", async () => {
        const { item } = holdingOf(VWCE, { broker: "Degiro", targetWeight: 60, notes: "core" });
        givenPortfolioWith({ item, instrument: VWCE });

        const changed = (
            await update.execute(item.id, { targetWeight: 25 }, READ_VERSION)
        )._unsafeUnwrap();

        expect(changed).toMatchObject({
            id: item.id,
            broker: "Degiro",
            targetWeight: 25,
            currentValue: item.currentValue,
            notes: "core",
        });
    });

    it("clears the notes when asked to", async () => {
        const { item } = holdingOf(VWCE, { notes: "rebalance yearly" });
        givenPortfolioWith({ item, instrument: VWCE });

        const changed = (
            await update.execute(item.id, { notes: undefined }, READ_VERSION)
        )._unsafeUnwrap();

        expect(changed.notes).toBeUndefined();
    });

    it("refuses a holding that is not in the portfolio", async () => {
        givenPortfolioWith();

        const error = (
            await update.execute(UNKNOWN_ID, { targetWeight: 5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PortfolioItemNotFoundError);
    });

    it("refuses a negative target weight", async () => {
        const { item } = holdingOf(VWCE);
        givenPortfolioWith({ item, instrument: VWCE });

        const error = (
            await update.execute(item.id, { targetWeight: -5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(ValidationError);
    });

    it("fails as unavailable while the service cannot be reached", async () => {
        givenApiUnavailable();

        const error = (
            await update.execute(UNKNOWN_ID, { targetWeight: 5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(NetworkError);
    });

    it("refuses a change made from a stale read", async () => {
        const { item } = holdingOf(VWCE, { updatedAt: "2026-10-03T08:00:00.000Z" });
        givenPortfolioWith({ item, instrument: VWCE });

        const error = (
            await update.execute(item.id, { targetWeight: 5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PortfolioItemConflictError);
    });

    it("refuses a change when the holding changed between the read and the write", async () => {
        const { item } = holdingOf(VWCE);
        givenPortfolioWith({ item, instrument: VWCE });
        givenChangedMeanwhile();

        const error = (
            await update.execute(item.id, { targetWeight: 5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(PortfolioItemConflictError);
    });
});
