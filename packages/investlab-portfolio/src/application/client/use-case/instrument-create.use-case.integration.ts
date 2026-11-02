import { beforeEach, describe, expect, it } from "vitest";
import { PORTFOLIO } from "#application/client/tokens.ts";
import { InstrumentAlreadyExistsError } from "#domain/error/instrument.error.ts";
import { AssetClass } from "#domain/value-object/asset-class.value-object.ts";
import { InstrumentType } from "#domain/value-object/instrument-type.value-object.ts";
import { givenApiUnavailable, givenCatalog, VWCE } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import { NetworkError } from "@m0n0lab/investlab-core";
import type { InstrumentCreateUseCase } from "./instrument-create.use-case.ts";

const VANGUARD_ALL_WORLD = {
    symbol: "vwce",
    name: "Vanguard FTSE All-World",
    type: InstrumentType.ETF,
    assetClass: AssetClass.Equity,
    exchange: "XETRA",
    replicates: "FTSE All-World",
};

describe("InstrumentCreateUseCase", () => {
    let create: InstrumentCreateUseCase;
    beforeEach(() => {
        create = container.get(PORTFOLIO.InstrumentCreate);
    });

    describe("adding an instrument to the catalog", () => {
        it("returns the instrument as the service recorded it", async () => {
            givenCatalog();

            const instrument = (await create.execute(VANGUARD_ALL_WORLD))._unsafeUnwrap();

            expect(instrument).toMatchObject({
                id: expect.any(String),
                symbol: "VWCE",
                name: "Vanguard FTSE All-World",
                exchange: "XETRA",
                replicates: "FTSE All-World",
                quotable: true,
            });
        });

        it("refuses a symbol already in the catalog", async () => {
            givenCatalog(VWCE);

            const error = (await create.execute(VANGUARD_ALL_WORLD))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InstrumentAlreadyExistsError);
        });

        it("fails as unavailable while the service cannot be reached", async () => {
            givenApiUnavailable();

            const error = (await create.execute(VANGUARD_ALL_WORLD))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(NetworkError);
        });
    });
});
