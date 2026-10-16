import { beforeEach, describe, expect, it } from "vitest";
import { InstrumentAlreadyExistsError, InstrumentNotFoundError } from "../../domain/errors.ts";
import { catalog, givenInstrument, UNKNOWN_ID } from "./given.ts";
import { PORTFOLIO } from "./tokens.ts";
import { container } from "./vitest-integration-setup.ts";
import type { InstrumentUpdateUseCase } from "./instrument-update.use-case.ts";

let update: InstrumentUpdateUseCase;
beforeEach(() => {
    update = container.get(PORTFOLIO.InstrumentUpdate);
});

describe("changing an instrument", () => {
    it("records the new name and keeps everything else", async () => {
        const vti = await givenInstrument("VTI");

        const changed = (
            await update.execute(vti.id, { name: "Vanguard Total Market" })
        )._unsafeUnwrap();

        expect(changed).toEqual(
            expect.objectContaining({
                id: vti.id,
                symbol: "VTI",
                name: "Vanguard Total Market",
                exchange: "NYSE Arca",
                replicates: "CRSP US Total Market",
            }),
        );
        expect(await catalog()).toContainEqual(changed);
    });

    it("clears the exchange and the tracked index when asked to", async () => {
        const spy = await givenInstrument("SPY");

        const changed = (
            await update.execute(spy.id, { exchange: undefined, replicates: undefined })
        )._unsafeUnwrap();

        expect(changed.exchange).toBeUndefined();
        expect(changed.replicates).toBeUndefined();
        expect(await catalog()).toContainEqual(changed);
    });

    it("refuses an instrument that is not in the catalog", async () => {
        const error = (await update.execute(UNKNOWN_ID, { name: "Nothing" }))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InstrumentNotFoundError);
    });

    it("refuses a symbol another instrument already has and keeps the instrument as it was", async () => {
        const msft = await givenInstrument("MSFT");

        const error = (await update.execute(msft.id, { symbol: "nvda" }))._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(InstrumentAlreadyExistsError);
        expect(await catalog()).toContainEqual(msft);
    });
});
