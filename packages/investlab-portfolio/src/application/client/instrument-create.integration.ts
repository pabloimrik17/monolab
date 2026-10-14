import { beforeEach, describe, expect, it } from "vitest";
import { NetworkError } from "@m0n0lab/investlab-core";
import { InstrumentAlreadyExistsError } from "../../domain/errors.ts";
import { AssetClass } from "../../domain/value-objects/asset-class.ts";
import { InstrumentType } from "../../domain/value-objects/instrument-type.ts";
import { givenApiUnavailable, givenCatalog, VWCE } from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { InstrumentCreateUseCase } from "./instrument-create.use-case.ts";

const VANGUARD_ALL_WORLD = {
    symbol: "vwce",
    name: "Vanguard FTSE All-World",
    type: InstrumentType.ETF,
    assetClass: AssetClass.Equity,
    exchange: "XETRA",
    replicates: "FTSE All-World",
};

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
