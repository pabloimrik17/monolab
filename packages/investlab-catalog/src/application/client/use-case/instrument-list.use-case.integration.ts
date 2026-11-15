import { beforeEach, describe, expect, it } from "vitest";
import { CATALOG } from "#application/client/tokens.ts";
import {
    BITCOIN,
    givenApiUnavailable,
    givenCatalog,
    givenTokenRejected,
    VWCE,
} from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import { NetworkError, UnauthorizedError } from "@m0n0lab/investlab-core";
import type { InstrumentListUseCase } from "./instrument-list.use-case.ts";

describe("InstrumentListUseCase", () => {
    let list: InstrumentListUseCase;
    beforeEach(() => {
        list = container.get(CATALOG.InstrumentList);
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
});
