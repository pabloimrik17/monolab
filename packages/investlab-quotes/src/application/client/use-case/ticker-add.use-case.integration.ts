import { beforeEach, describe, expect, it } from "vitest";
import { QUOTES } from "#application/client/tokens.ts";
import { givenStoredTickers, storedTickers } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import type { TickerAddUseCase } from "./ticker-add.use-case.ts";
import type { TickerListUseCase } from "./ticker-list.use-case.ts";

let add: TickerAddUseCase;
let list: TickerListUseCase;
beforeEach(() => {
    add = container.get(QUOTES.TickerAdd);
    list = container.get(QUOTES.TickerList);
});

describe("following a ticker", () => {
    it("follows the symbol uppercased", () => {
        const ticker = add.execute("aapl")._unsafeUnwrap();

        expect(ticker).toMatchObject({ symbol: "AAPL", addedAt: expect.any(Date) });
        expect(list.execute()).toEqual([ticker]);
    });

    it("saves the list with ISO dates under the stored key", () => {
        const { addedAt } = add.execute("AAPL")._unsafeUnwrap();

        expect(storedTickers()).toEqual([{ symbol: "AAPL", addedAt: addedAt.toISOString() }]);
    });

    it("keeps the ticker already followed, without a duplicate", () => {
        const first = add.execute("AAPL")._unsafeUnwrap();

        const second = add.execute("aapl")._unsafeUnwrap();

        expect(second).toEqual(first);
        expect(list.execute()).toEqual([first]);
    });

    it("refuses an invalid symbol, following nothing", () => {
        const error = add.execute("AA PL")._unsafeUnwrapErr();

        expect(error.code).toBe("VALIDATION_ERROR");
        expect(list.execute()).toEqual([]);
    });

    it("adds to the saved list", () => {
        givenStoredTickers('[{"symbol":"MSFT","addedAt":"2026-09-30T08:15:00.000Z"}]');

        add.execute("AAPL");

        expect(list.execute().map((ticker) => ticker.symbol)).toEqual(["AAPL", "MSFT"]);
    });

    it("starts over from an unreadable stored value", () => {
        givenStoredTickers("not json");

        add.execute("AAPL");

        expect(list.execute().map((ticker) => ticker.symbol)).toEqual(["AAPL"]);
    });
});
