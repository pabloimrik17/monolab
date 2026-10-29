import { beforeEach, describe, expect, it } from "vitest";
import { QUOTES } from "#application/client/tokens.ts";
import { givenStoredTickers } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import type { TickerListUseCase } from "./ticker-list.use-case.ts";

let list: TickerListUseCase;
beforeEach(() => {
    list = container.get(QUOTES.TickerList);
});

describe("listing followed tickers", () => {
    it("returns nothing when no ticker is followed", () => {
        expect(list.execute()).toEqual([]);
    });

    it("returns the stored tickers alphabetically", () => {
        givenStoredTickers(
            JSON.stringify([
                { symbol: "MSFT", addedAt: "2026-10-01T10:00:00.000Z" },
                { symbol: "AAPL", addedAt: "2026-10-02T10:00:00.000Z" },
                { symbol: "GOOGL", addedAt: "2026-10-03T10:00:00.000Z" },
            ]),
        );

        expect(list.execute().map((ticker) => ticker.symbol)).toEqual(["AAPL", "GOOGL", "MSFT"]);
    });

    it("loads a list saved by the previous ticker store with its dates", () => {
        givenStoredTickers('[{"symbol":"AAPL","addedAt":"2026-09-30T08:15:00.000Z"}]');

        expect(list.execute()).toEqual([
            { symbol: "AAPL", addedAt: new Date("2026-09-30T08:15:00.000Z") },
        ]);
    });

    it.each([["not json"], ['{"symbol":"AAPL"}'], ['[{"symbol":1}]']])(
        "returns nothing, without failing, when the stored value is %s",
        (raw) => {
            givenStoredTickers(raw);

            expect(list.execute()).toEqual([]);
        },
    );
});
