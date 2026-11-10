import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROGER } from "#application/server/tokens.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { givenEntry, givenInstrument, listed } from "#testing/server/given.ts";
import { container, containerWithDatabaseDown } from "#testing/server/vitest-integration-setup.ts";
import { PersistenceError } from "@m0n0lab/investlab-core";
import type { EntryListUseCase } from "./entry-list.use-case.ts";

describe("EntryListUseCase", () => {
    let list: EntryListUseCase;
    beforeEach(() => {
        list = container.get(ROGER.EntryList);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    describe("listing the active entries", () => {
        it("leaves out sold entries and orders by symbol, then by creation", async () => {
            const aapl = await givenInstrument("AAPL");
            const msft = await givenInstrument("MSFT");
            const vwce = await givenInstrument("VWCE");
            vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-02T10:00:00Z") });
            const newerApple = await givenEntry(aapl);
            await givenEntry(aapl, { state: RogerState.Sold });
            const microsoft = await givenEntry(msft, { state: RogerState.Invested });
            const fund = await givenEntry(vwce);
            vi.setSystemTime(new Date("2026-10-01T10:00:00Z"));
            const olderApple = await givenEntry(aapl, { state: RogerState.Shortlisted });

            const active = (await list.execute("active"))._unsafeUnwrap();

            expect(active).toEqual([
                { entry: olderApple, instrument: listed(aapl) },
                { entry: newerApple, instrument: listed(aapl) },
                { entry: microsoft, instrument: listed(msft) },
                { entry: fund, instrument: listed(vwce) },
            ]);
            expect(active[3]?.instrument).toMatchObject({ sector: undefined });
        });
    });

    describe("listing the history", () => {
        it("holds only sold entries, the latest sell date first", async () => {
            const aapl = await givenInstrument("AAPL");
            await givenEntry(aapl);
            const october = await givenEntry(aapl, {
                state: RogerState.Sold,
                sellDate: "2026-10-01",
            });
            const november = await givenEntry(aapl, {
                state: RogerState.Sold,
                sellDate: "2026-11-01",
            });

            const history = (await list.execute("history"))._unsafeUnwrap();

            expect(history).toEqual([
                { entry: november, instrument: listed(aapl) },
                { entry: october, instrument: listed(aapl) },
            ]);
        });
    });

    describe("listing while the database is unreachable", () => {
        beforeEach(() => {
            list = containerWithDatabaseDown.get(ROGER.EntryList);
        });

        it("fails as a persistence error", async () => {
            const error = (await list.execute("active"))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(PersistenceError);
        });
    });
});
