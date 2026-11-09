import { describe, expect, it } from "vitest";
import { InstrumentNotFoundError } from "@m0n0lab/investlab-catalog";
import { makeInstrument } from "@m0n0lab/investlab-catalog/testing";
import { NetworkError } from "@m0n0lab/investlab-core";
import {
    PortfolioItemConflictError,
    PortfolioItemNotFoundError,
} from "@m0n0lab/investlab-portfolio";
import { makePortfolioItem } from "@m0n0lab/investlab-portfolio/testing";
import { PortfolioPageHarness } from "./portfolio.page.harness";

function holding(
    symbol: string,
    overrides: Parameters<typeof makePortfolioItem>[0] = {},
    replicates?: string,
) {
    const instrument = makeInstrument({ symbol, ...(replicates && { replicates }) });
    const item = makePortfolioItem({ instrumentId: instrument.id, ...overrides });
    return { item, instrument };
}

describe("PortfolioPage", () => {
    it("lists each item with its instrument, broker, weight, value and replicated index", async () => {
        const tracker = holding(
            "VWCE",
            { broker: "Degiro", targetWeight: 12.5, currentValue: 1500 },
            "MSCI World",
        );
        const plain = holding("AAPL", { broker: "MyInvestor", targetWeight: 10 });
        await using page = await PortfolioPageHarness.launch({ items: [tracker, plain] });

        expect(page.listedItems()).toEqual([
            {
                name: tracker.instrument.name,
                symbol: "VWCE",
                type: tracker.instrument.type,
                assetClass: tracker.instrument.assetClass,
                broker: "Degiro",
                targetWeight: "12.50%",
                currentValue: "€1,500.00",
                replicates: "MSCI World",
            },
            {
                name: plain.instrument.name,
                symbol: "AAPL",
                type: plain.instrument.type,
                assetClass: plain.instrument.assetClass,
                broker: "MyInvestor",
                targetWeight: "10.00%",
                currentValue: "€0.00",
                replicates: "—",
            },
        ]);
    });

    it("invites the user to add a first item when the portfolio is empty", async () => {
        await using page = await PortfolioPageHarness.launch();

        expect(page.showsEmptyList()).toBe(true);
        expect(page.listedItems()).toEqual([]);
    });

    it("shows the error page with the failure's status and message when loading fails", async () => {
        await using page = await PortfolioPageHarness.launch({
            loadFails: new NetworkError("offline"),
        });

        expect(page.errorPage()).toEqual({
            status: "503",
            message: "InvestLab service is unavailable. Please try again later.",
        });
    });

    it("creates an item from the form, shows the reloaded list and closes the form", async () => {
        const instrument = makeInstrument({ symbol: "SPY" });
        await using page = await PortfolioPageHarness.launch({ instruments: [instrument] });
        const creation = page.givenCreateSucceeds();
        const created = { item: makePortfolioItem({ instrumentId: instrument.id }), instrument };
        page.givenItems([created], [instrument]);

        await page.openAddForm();
        await page.fillForm({
            instrumentId: instrument.id,
            broker: "Degiro",
            targetWeight: "25",
            currentValue: "1500.5",
            notes: "Core holding",
        });
        await page.submitForm();

        expect(creation.calls).toEqual([
            [
                {
                    instrumentId: instrument.id,
                    broker: "Degiro",
                    targetWeight: 25,
                    currentValue: 1500.5,
                    notes: "Core holding",
                },
            ],
        ]);
        expect(page.listedSymbols()).toEqual(["SPY"]);
        expect(page.formIsOpen()).toBe(false);
    });

    it("shows the remote error and keeps the form open when creating fails", async () => {
        const instrument = makeInstrument({ symbol: "SPY" });
        await using page = await PortfolioPageHarness.launch({ instruments: [instrument] });
        page.givenCreateFails(new InstrumentNotFoundError(instrument.id));

        await page.openAddForm();
        await page.fillForm({ instrumentId: instrument.id, broker: "Degiro", targetWeight: "5" });
        await page.submitForm();

        expect(page.formIsOpen()).toBe(true);
        expect(page.formErrors().message).toBe(`Instrument not found: ${instrument.id}`);
    });

    it("flags the fields the schema rejects and does not call the use case", async () => {
        const instrument = makeInstrument({ symbol: "SPY" });
        await using page = await PortfolioPageHarness.launch({ instruments: [instrument] });
        const creation = page.givenCreateSucceeds();

        await page.openAddForm();
        // Whitespace satisfies the browser's `required`, but the schema trims it to blank.
        await page.fillForm({ instrumentId: instrument.id, broker: "   ", targetWeight: "5" });
        await page.submitForm();

        const errors = page.formErrors();
        expect(errors.message).toBe("Please fix the highlighted fields.");
        expect(Object.keys(errors.fields)).toEqual(["Broker"]);
        expect(creation.calls).toEqual([]);
        expect(page.formIsOpen()).toBe(true);
    });

    it("edits an item through a prefilled form with the instrument locked", async () => {
        const original = holding("AAPL", {
            broker: "MyInvestor",
            targetWeight: 10,
            currentValue: 200,
            notes: "Old note",
        });
        await using page = await PortfolioPageHarness.launch({
            items: [original],
            instruments: [original.instrument],
        });
        const update = page.givenUpdateSucceeds();
        page.givenItems([
            {
                ...original,
                item: makePortfolioItem({ instrumentId: original.instrument.id, broker: "Degiro" }),
            },
        ]);

        await page.openEditForm("AAPL");

        expect(page.formContent()).toEqual({
            instrumentId: original.instrument.id,
            instrumentLocked: true,
            broker: "MyInvestor",
            targetWeight: "10",
            currentValue: "200",
            notes: "Old note",
        });

        await page.fillForm({ broker: "Degiro", targetWeight: "15" });
        await page.submitForm();

        expect(update.calls).toEqual([
            [
                original.item.id,
                { broker: "Degiro", targetWeight: 15, currentValue: 200, notes: "Old note" },
                original.item.updatedAt,
            ],
        ]);
        expect(page.formIsOpen()).toBe(false);
        expect(page.listedItems().map((listed) => listed.broker)).toEqual(["Degiro"]);
    });

    it("shows the conflict message and keeps the form open when the item changed meanwhile", async () => {
        const original = holding("AAPL");
        await using page = await PortfolioPageHarness.launch({
            items: [original],
            instruments: [original.instrument],
        });
        page.givenUpdateFails(new PortfolioItemConflictError(original.item.id));

        await page.openEditForm("AAPL");
        await page.fillForm({ broker: "Degiro" });
        await page.submitForm();

        expect(page.formIsOpen()).toBe(true);
        expect(page.formErrors().message).toBe(
            `Portfolio item ${original.item.id} was changed by another request; reload and try again`,
        );
    });

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

    it("keeps the item when the user cancels the confirmation", async () => {
        const apple = holding("AAPL");
        await using page = await PortfolioPageHarness.launch({ items: [apple] });
        const deletion = page.givenDeleteSucceeds();

        await page.deleteItem("AAPL", { confirmed: false });

        expect(deletion.calls).toEqual([]);
        expect(page.listedSymbols()).toEqual(["AAPL"]);
    });

    it("shows the failure in the row when deleting fails", async () => {
        const apple = holding("AAPL");
        await using page = await PortfolioPageHarness.launch({ items: [apple] });
        page.givenDeleteFails(new PortfolioItemNotFoundError(apple.item.id));

        await page.deleteItem("AAPL");

        expect(page.rowError("AAPL")).toBe(`Portfolio item not found: ${apple.item.id}`);
        expect(page.listedSymbols()).toEqual(["AAPL"]);
    });
});
