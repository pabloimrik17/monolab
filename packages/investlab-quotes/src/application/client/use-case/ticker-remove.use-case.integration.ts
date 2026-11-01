import { beforeEach, describe, expect, it } from "vitest";
import { QUOTES } from "#application/client/tokens.ts";
import { storedTickers } from "#testing/client/given.ts";
import { container } from "#testing/client/vitest-integration-setup.ts";
import type { TickerAddUseCase } from "./ticker-add.use-case.ts";
import type { TickerListUseCase } from "./ticker-list.use-case.ts";
import type { TickerRemoveUseCase } from "./ticker-remove.use-case.ts";

describe("TickerRemoveUseCase", () => {
    let add: TickerAddUseCase;
    let remove: TickerRemoveUseCase;
    let list: TickerListUseCase;
    beforeEach(() => {
        add = container.get(QUOTES.TickerAdd);
        remove = container.get(QUOTES.TickerRemove);
        list = container.get(QUOTES.TickerList);
    });

    it("removes the followed ticker and saves the rest", () => {
        add.execute("AAPL");
        add.execute("MSFT");

        remove.execute("aapl");

        expect(list.execute().map((ticker) => ticker.symbol)).toEqual(["MSFT"]);
        expect(storedTickers()).toEqual([{ symbol: "MSFT", addedAt: expect.any(String) }]);
    });

    it("leaves the list as is for a symbol not followed", () => {
        add.execute("AAPL");

        remove.execute("XYZ");

        expect(list.execute().map((ticker) => ticker.symbol)).toEqual(["AAPL"]);
    });
});
