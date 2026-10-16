import { beforeEach, describe, expect, it } from "vitest";
import { ValidationError } from "@m0n0lab/investlab-core";
import { InstrumentAlreadyExistsError } from "../../domain/errors.ts";
import { AssetClass } from "../../domain/value-objects/asset-class.ts";
import { InstrumentType } from "../../domain/value-objects/instrument-type.ts";
import { catalog } from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { InstrumentCreateUseCase } from "./instrument-create.use-case.ts";

let create: InstrumentCreateUseCase;
beforeEach(() => {
    create = container.get(PORTFOLIO.InstrumentCreate);
});

describe("adding an instrument to the catalog", () => {
    it("lists it with its symbol in capitals", async () => {
        const instrument = (
            await create.execute({
                symbol: " vwce ",
                name: "Vanguard FTSE All-World",
                type: InstrumentType.ETF,
                assetClass: AssetClass.Equity,
                exchange: "XETRA",
                replicates: "FTSE All-World",
            })
        )._unsafeUnwrap();

        expect(instrument).toMatchObject({
            symbol: "VWCE",
            name: "Vanguard FTSE All-World",
            exchange: "XETRA",
            replicates: "FTSE All-World",
            quotable: true,
        });
        expect(await catalog()).toContainEqual(instrument);
    });

    it("refuses a symbol already in the catalog and leaves the catalog unchanged", async () => {
        const before = await catalog();

        const error = (
            await create.execute({
                symbol: " aapl ",
                name: "Another Apple",
                type: InstrumentType.Stock,
                assetClass: AssetClass.Equity,
            })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InstrumentAlreadyExistsError);
        expect(await catalog()).toEqual(before);
    });

    it("refuses an instrument without a name", async () => {
        const error = (
            await create.execute({
                symbol: "IWDA",
                name: "  ",
                type: InstrumentType.ETF,
                assetClass: AssetClass.Equity,
            })
        )._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(ValidationError);
    });
});
