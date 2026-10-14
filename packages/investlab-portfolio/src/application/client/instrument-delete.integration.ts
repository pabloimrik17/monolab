import { beforeEach, describe, expect, it } from "vitest";
import { NetworkError } from "@m0n0lab/investlab-core";
import { InstrumentInUseError } from "../../domain/errors.ts";
import {
    BITCOIN,
    givenApiUnavailable,
    givenCatalog,
    givenPortfolioWith,
    holdingOf,
    VWCE,
} from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { InstrumentDeleteUseCase } from "./instrument-delete.use-case.ts";

let remove: InstrumentDeleteUseCase;
beforeEach(() => {
    remove = container.get(PORTFOLIO.InstrumentDelete);
});

describe("removing an instrument from the catalog", () => {
    it("succeeds for an instrument no holding uses", async () => {
        givenCatalog(VWCE, BITCOIN);
        givenPortfolioWith(holdingOf(VWCE));

        const result = await remove.execute(BITCOIN.id);

        expect(result.isOk()).toBe(true);
    });

    it("refuses an instrument the portfolio holds", async () => {
        givenCatalog(VWCE);
        givenPortfolioWith(holdingOf(VWCE));

        const error = (await remove.execute(VWCE.id))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InstrumentInUseError);
    });

    it("fails as unavailable while the service cannot be reached", async () => {
        givenApiUnavailable();

        const error = (await remove.execute(VWCE.id))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(NetworkError);
    });
});
