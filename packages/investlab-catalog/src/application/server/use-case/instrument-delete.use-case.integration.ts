import { beforeEach, describe, expect, it } from "vitest";
import { CATALOG } from "#application/server/tokens.ts";
import { InstrumentNotFoundError } from "#domain/error/instrument.error.ts";
import { catalog, givenInstrument, UNKNOWN_ID } from "#testing/server/given.ts";
import { container } from "#testing/server/vitest-integration-setup.ts";
import type { InstrumentDeleteUseCase } from "./instrument-delete.use-case.ts";

describe("InstrumentDeleteUseCase", () => {
    let remove: InstrumentDeleteUseCase;
    beforeEach(() => {
        remove = container.get(CATALOG.InstrumentDelete);
    });

    describe("removing an instrument from the catalog", () => {
        it("removes an instrument nothing references", async () => {
            const vwce = await givenInstrument("VWCE");

            (await remove.execute(vwce.id))._unsafeUnwrap();

            expect(await catalog()).not.toContainEqual(vwce);
        });

        it("refuses an instrument that is not in the catalog", async () => {
            const error = (await remove.execute(UNKNOWN_ID))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InstrumentNotFoundError);
        });
    });
});
