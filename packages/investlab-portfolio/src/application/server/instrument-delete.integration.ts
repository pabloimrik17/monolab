import { beforeEach, describe, expect, it } from "vitest";
import { InstrumentInUseError, InstrumentNotFoundError } from "../../domain/errors.ts";
import { catalog, givenHolding, givenInstrument, UNKNOWN_ID } from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { InstrumentDeleteUseCase } from "./instrument-delete.use-case.ts";

let remove: InstrumentDeleteUseCase;
beforeEach(() => {
    remove = container.get(PORTFOLIO.InstrumentDelete);
});

describe("removing an instrument from the catalog", () => {
    it("removes an instrument no holding uses", async () => {
        const vwce = await givenInstrument("VWCE");

        (await remove.execute(vwce.id))._unsafeUnwrap();

        expect(await catalog()).not.toContainEqual(vwce);
    });

    it("refuses an instrument the portfolio holds and keeps it in the catalog", async () => {
        const apple = await givenInstrument("AAPL");
        await givenHolding(apple);

        const error = (await remove.execute(apple.id))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InstrumentInUseError);
        expect(await catalog()).toContainEqual(apple);
    });

    it("removes it once the last holding of it is gone", async () => {
        const tesla = await givenInstrument("TSLA");
        const holding = await givenHolding(tesla);
        (await container.get(PORTFOLIO.ItemDelete).execute(holding.id))._unsafeUnwrap();

        (await remove.execute(tesla.id))._unsafeUnwrap();

        expect(await catalog()).not.toContainEqual(tesla);
    });

    it("refuses an instrument that is not in the catalog", async () => {
        const error = (await remove.execute(UNKNOWN_ID))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InstrumentNotFoundError);
    });
});
