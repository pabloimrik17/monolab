import { beforeEach, describe, expect, it } from "vitest";
import { NetworkError, UnauthorizedError } from "@m0n0lab/investlab-core";
import { BITCOIN, givenApiUnavailable, givenCatalog, givenTokenRejected, VWCE } from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { InstrumentListUseCase } from "./instrument-list.use-case.ts";

let list: InstrumentListUseCase;
beforeEach(() => {
    list = container.get(PORTFOLIO.InstrumentList);
});

describe("listing the instrument catalog", () => {
    it("returns every instrument in the catalog", async () => {
        givenCatalog(VWCE, BITCOIN);

        const catalog = (await list.execute())._unsafeUnwrap();

        expect(catalog).toMatchObject([VWCE, BITCOIN]);
    });

    it("returns nothing when the catalog is empty", async () => {
        givenCatalog();

        const catalog = (await list.execute())._unsafeUnwrap();

        expect(catalog).toEqual([]);
    });

    it("fails as unavailable while the service cannot be reached", async () => {
        givenApiUnavailable();

        const error = (await list.execute())._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(NetworkError);
    });

    it("fails as unauthorized when the service rejects the web's credentials", async () => {
        givenTokenRejected();

        const error = (await list.execute())._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(UnauthorizedError);
    });
});
