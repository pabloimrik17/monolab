import { beforeEach, describe, expect, it } from "vitest";
import { PersistenceError } from "@m0n0lab/investlab-core";
import { givenInstrument, SEEDED_SYMBOLS } from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container, containerWithDatabaseDown } from "./vitest-integration-setup.ts";
import type { InstrumentListUseCase } from "./instrument-list.use-case.ts";

let list: InstrumentListUseCase;
beforeEach(() => {
    list = container.get(PORTFOLIO.InstrumentList);
});

describe("listing the instrument catalog", () => {
    it("starts with the seeded catalog, every instrument quotable", async () => {
        const catalog = (await list.execute())._unsafeUnwrap();

        expect(catalog.map(({ symbol }) => symbol)).toEqual(
            expect.arrayContaining([...SEEDED_SYMBOLS]),
        );
        expect(catalog.every(({ quotable }) => quotable)).toBe(true);
    });

    it("includes instruments added to the catalog", async () => {
        const spy = await givenInstrument("SPY");
        const vwce = await givenInstrument("VWCE");

        const catalog = (await list.execute())._unsafeUnwrap();

        expect(catalog).toEqual(expect.arrayContaining([spy, vwce]));
    });

    describe("while the database is unreachable", () => {
        beforeEach(() => {
            list = containerWithDatabaseDown.get(PORTFOLIO.InstrumentList);
        });

        it("fails as a persistence error", async () => {
            const error = (await list.execute())._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(PersistenceError);
        });
    });
});
