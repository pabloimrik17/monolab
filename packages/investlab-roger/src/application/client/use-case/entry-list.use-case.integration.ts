import { beforeEach, describe, expect, it } from "vitest";
import { ROGER } from "#application/client/tokens.ts";
import { RogerState } from "#domain/value-object/roger-state.value-object.ts";
import { AAPL, entryOf, givenApiUnavailable, givenRogerWith, JPM } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import { NetworkError } from "@m0n0lab/investlab-core";
import type { EntryListUseCase } from "./entry-list.use-case.ts";

describe("EntryListUseCase", () => {
    let list: EntryListUseCase;
    beforeEach(() => {
        list = container.get(ROGER.EntryList);
    });

    it("lists the active entries with their instrument, by default", async () => {
        givenRogerWith(
            entryOf(AAPL),
            entryOf(JPM, { state: RogerState.Invested }),
            entryOf(AAPL, { state: RogerState.Sold }),
        );

        const rows = (await list.execute())._unsafeUnwrap();

        expect(rows.map(({ entry, instrument }) => [instrument.symbol, entry.state])).toEqual([
            ["AAPL", RogerState.Watching],
            ["JPM", RogerState.Invested],
        ]);
        expect(rows[1]?.instrument).toEqual({
            symbol: "JPM",
            name: "JPMorgan Chase",
            sector: "financial",
        });
    });

    it("lists the sold entries as the history", async () => {
        givenRogerWith(entryOf(AAPL), entryOf(AAPL, { state: RogerState.Sold }));

        const rows = (await list.execute("history"))._unsafeUnwrap();

        expect(rows.map(({ entry }) => entry.state)).toEqual([RogerState.Sold]);
    });

    it("fails as unavailable while the service cannot be reached", async () => {
        givenApiUnavailable();

        const error = (await list.execute())._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(NetworkError);
    });
});
