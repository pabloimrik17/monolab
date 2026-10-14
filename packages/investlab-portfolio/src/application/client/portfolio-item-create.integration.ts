import { beforeEach, describe, expect, it } from "vitest";
import { NetworkError, UnauthorizedError, ValidationError } from "@m0n0lab/investlab-core";
import { InstrumentNotFoundError } from "../../domain/errors.ts";
import {
    givenApiUnavailable,
    givenCatalog,
    givenTokenRejected,
    UNKNOWN_ID,
    VWCE,
} from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { PortfolioItemCreateUseCase } from "./portfolio-item-create.use-case.ts";

let create: PortfolioItemCreateUseCase;
beforeEach(() => {
    create = container.get(PORTFOLIO.ItemCreate);
});

describe("adding a holding", () => {
    it("returns the holding as the service recorded it", async () => {
        givenCatalog(VWCE);

        const item = (
            await create.execute({
                instrumentId: VWCE.id,
                broker: "Degiro",
                targetWeight: 60,
                currentValue: 1500.5,
                notes: "core holding",
            })
        )._unsafeUnwrap();

        expect(item).toMatchObject({
            id: expect.any(String),
            instrumentId: VWCE.id,
            broker: "Degiro",
            targetWeight: 60,
            currentValue: 1500.5,
            notes: "core holding",
            createdAt: expect.any(Date),
        });
    });

    it("starts a holding with no current value at zero", async () => {
        givenCatalog(VWCE);

        const item = (
            await create.execute({ instrumentId: VWCE.id, broker: "Degiro", targetWeight: 60 })
        )._unsafeUnwrap();

        expect(item.currentValue).toBe(0);
        expect(item.notes).toBeUndefined();
    });

    it("refuses a negative target weight without asking the service", async () => {
        const error = (
            await create.execute({ instrumentId: VWCE.id, broker: "Degiro", targetWeight: -1 })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(ValidationError);
    });

    it("refuses an instrument that is not in the catalog", async () => {
        givenCatalog(VWCE);

        const error = (
            await create.execute({ instrumentId: UNKNOWN_ID, broker: "Degiro", targetWeight: 60 })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InstrumentNotFoundError);
    });

    it("fails as unavailable while the service cannot be reached", async () => {
        givenApiUnavailable();

        const error = (
            await create.execute({ instrumentId: VWCE.id, broker: "Degiro", targetWeight: 60 })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(NetworkError);
    });

    it("fails as unauthorized when the service rejects the web's credentials", async () => {
        givenTokenRejected();

        const error = (
            await create.execute({ instrumentId: VWCE.id, broker: "Degiro", targetWeight: 60 })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(UnauthorizedError);
    });
});
