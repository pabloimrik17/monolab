import { beforeEach, describe, expect, it } from "vitest";
import { CATALOG } from "#application/client/tokens.ts";
import { InstrumentNotFoundError } from "#domain/error/instrument.error.ts";
import { givenApiUnavailable, givenCatalog, UNKNOWN_ID, VWCE } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import { NetworkError } from "@m0n0lab/investlab-core";
import type { InstrumentUpdateUseCase } from "./instrument-update.use-case.ts";

describe("InstrumentUpdateUseCase", () => {
    let update: InstrumentUpdateUseCase;
    beforeEach(() => {
        update = container.get(CATALOG.InstrumentUpdate);
    });

    describe("changing an instrument", () => {
        it("returns the instrument with the change and everything else kept", async () => {
            givenCatalog(VWCE);

            const changed = (
                await update.execute(VWCE.id, { name: "Vanguard All-World Acc" })
            )._unsafeUnwrap();

            expect(changed).toMatchObject({ ...VWCE, name: "Vanguard All-World Acc" });
        });

        it("clears the exchange when asked to", async () => {
            givenCatalog(VWCE);

            const changed = (
                await update.execute(VWCE.id, { exchange: undefined })
            )._unsafeUnwrap();

            expect(changed.exchange).toBeUndefined();
            expect(changed.replicates).toBe(VWCE.replicates);
        });

        it("refuses an instrument that is not in the catalog", async () => {
            givenCatalog(VWCE);

            const error = (
                await update.execute(UNKNOWN_ID, { name: "Nothing" })
            )._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InstrumentNotFoundError);
        });

        it("fails as unavailable while the service cannot be reached", async () => {
            givenApiUnavailable();

            const error = (await update.execute(VWCE.id, { name: "Nothing" }))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(NetworkError);
        });
    });
});
