import { describe, expect, it } from "vitest";
import { makeInstrument } from "@m0n0lab/investlab-catalog/testing";
import { makePortfolioItem } from "@m0n0lab/investlab-portfolio/testing";
import { PortfolioPageHarness } from "./portfolio.page.harness";

describe("PortfolioPage", () => {
    it("deletes an item and shows the reloaded list", async () => {
        const instrument = makeInstrument({ symbol: "AAPL" });
        const apple = { item: makePortfolioItem({ instrumentId: instrument.id }), instrument };
        await using page = await PortfolioPageHarness.launch({ items: [apple] });
        const deletion = page.givenDeleteSucceeds();
        page.givenItems([]);

        await page.deleteItem("AAPL");

        expect(deletion.calls).toEqual([[apple.item.id]]);
        expect(page.listedSymbols()).toEqual([]);
    });
});
