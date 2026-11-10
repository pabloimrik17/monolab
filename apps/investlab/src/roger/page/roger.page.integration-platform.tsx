import { describe, expect, it } from "vitest";
import { Sector, type Instrument } from "@m0n0lab/investlab-catalog";
import { makeInstrument } from "@m0n0lab/investlab-catalog/testing";
import {
    EntryNotFoundError,
    MissingRequiredFieldError,
    RogerState,
    type Entry,
    type EntryWithInstrument,
} from "@m0n0lab/investlab-roger";
import { makeEntry } from "@m0n0lab/investlab-roger/testing";
import { RogerPageHarness } from "./roger.page.harness";

const aapl = makeInstrument({ symbol: "AAPL", sector: Sector.Technology });
const msft = makeInstrument({ symbol: "MSFT" });
const nvda = makeInstrument({ symbol: "NVDA" });

function entryOf(instrument: Instrument, state: RogerState, entryPrice: number): Entry {
    return makeEntry({ instrumentId: instrument.id, state, entryPrice });
}

const shown = (instrument: Instrument, entry: Entry): EntryWithInstrument => ({
    entry,
    instrument,
});

function today(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

describe("RogerPage", () => {
    it("groups an instrument's active entries under one heading, each with its own state, prices and fields", async () => {
        const watching = entryOf(aapl, RogerState.Watching, 100);
        const invested = makeEntry({
            instrumentId: aapl.id,
            state: RogerState.Invested,
            entryPrice: 130,
            quantity: 5,
            buyCommission: 1.5,
            buyDate: "2026-09-15",
        });
        const sellOrder = makeEntry({
            instrumentId: aapl.id,
            state: RogerState.SellOrder,
            entryPrice: 120,
            exitPrice: 190,
        });
        await using page = await RogerPageHarness.launch({
            entries: [
                shown(aapl, watching),
                shown(aapl, invested),
                shown(aapl, sellOrder),
                shown(msft, entryOf(msft, RogerState.Watching, 300)),
            ],
        });

        expect(page.groupedSymbols()).toEqual(["AAPL", "MSFT"]);
        const [group] = page.listedGroups();
        expect(group?.entries).toMatchObject([
            {
                state: "Watching",
                entryPrice: "100",
                quantity: "—",
                buyCommission: "—",
                buyDate: "—",
                exitPrice: "—",
                sellCommission: "—",
                sellDate: "—",
            },
            {
                state: "Invested",
                entryPrice: "130",
                quantity: "5",
                buyCommission: "1.5",
                buyDate: "2026-09-15",
                exitPrice: "—",
            },
            { state: "Sell order", entryPrice: "120", exitPrice: "190" },
        ]);
    });

    it("lists in the Move to menu only the transitions the entry's state allows", async () => {
        const invested = entryOf(aapl, RogerState.Invested, 130);
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, invested)] });

        expect(page.listedEntries()[0]?.actions).toEqual(["Edit", "Move to", "Delete"]);
        expect(await page.transitionsOf(invested)).toEqual(["Sell order", "Sold"]);
    });

    it("closes the Move to menu on Escape without opening a form", async () => {
        const watching = entryOf(aapl, RogerState.Watching, 150);
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, watching)] });
        await page.openMoveMenu(watching);
        expect(page.moveMenuIsOpen()).toBe(true);

        await page.pressEscape();

        expect(page.moveMenuIsOpen()).toBe(false);
        expect(page.formIsOpen()).toBe(false);
    });

    it("closes the Move to menu when the page scrolls", async () => {
        const watching = entryOf(aapl, RogerState.Watching, 150);
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, watching)] });
        await page.openMoveMenu(watching);
        expect(page.moveMenuIsOpen()).toBe(true);

        await page.scrollPage();

        expect(page.moveMenuIsOpen()).toBe(false);
    });

    it("keeps only one Move to menu open at a time", async () => {
        const upper = entryOf(aapl, RogerState.Watching, 150);
        const lower = entryOf(aapl, RogerState.Invested, 130);
        await using page = await RogerPageHarness.launch({
            entries: [shown(aapl, upper), shown(aapl, lower)],
        });
        await page.openMoveMenu(lower);
        const lowerItems = await page.visibleMenuItems();

        await page.openMoveMenu(upper);

        const upperItems = await page.visibleMenuItems();
        expect(lowerItems).toEqual(["Sell order", "Sold"]);
        expect(upperItems).not.toEqual(lowerItems);
        expect(upperItems).toEqual(["Shortlisted", "Trader bought", "Buy order", "Invested"]);
    });

    it("shows only the entries in the state filtered by and hides the instruments with none", async () => {
        await using page = await RogerPageHarness.launch({
            entries: [
                shown(aapl, entryOf(aapl, RogerState.BuyOrder, 100)),
                shown(aapl, entryOf(aapl, RogerState.Invested, 130)),
                shown(msft, entryOf(msft, RogerState.Invested, 300)),
                shown(nvda, entryOf(nvda, RogerState.BuyOrder, 90)),
            ],
        });

        await page.filterByState(RogerState.BuyOrder);

        expect(page.groupedSymbols()).toEqual(["AAPL", "NVDA"]);
        expect(page.listedEntries().map(({ state }) => state)).toEqual(["Buy order", "Buy order"]);

        await page.filterByState("");

        expect(page.groupedSymbols()).toEqual(["AAPL", "MSFT", "NVDA"]);
    });

    it("says no entry matches when the filter leaves every group empty", async () => {
        await using page = await RogerPageHarness.launch({
            entries: [shown(aapl, entryOf(aapl, RogerState.Invested, 130))],
        });

        await page.filterByState(RogerState.BuyOrder);

        expect(page.groupedSymbols()).toEqual([]);
        expect(page.emptyMessage()).toBe("No entries in Buy order.");
    });

    it("sorts the entries inside each group by the column clicked and keeps the groups in place", async () => {
        await using page = await RogerPageHarness.launch({
            entries: [
                shown(aapl, entryOf(aapl, RogerState.Watching, 150)),
                shown(aapl, entryOf(aapl, RogerState.Watching, 100)),
                shown(aapl, entryOf(aapl, RogerState.Watching, 200)),
                shown(msft, entryOf(msft, RogerState.Watching, 300)),
                shown(msft, entryOf(msft, RogerState.Watching, 50)),
            ],
        });
        const pricesByGroup = () =>
            page
                .listedGroups()
                .map(({ symbol, entries }) => [
                    symbol,
                    entries.map(({ entryPrice }) => entryPrice),
                ]);

        await page.sortBy("Entry price");

        expect(pricesByGroup()).toEqual([
            ["AAPL", ["100", "150", "200"]],
            ["MSFT", ["50", "300"]],
        ]);
        expect(page.sortDirection("Entry price")).toBe("ascending");

        await page.sortBy("Entry price");

        expect(pricesByGroup()).toEqual([
            ["AAPL", ["200", "150", "100"]],
            ["MSFT", ["300", "50"]],
        ]);
        expect(page.sortDirection("Entry price")).toBe("descending");
    });

    it("sorts by state in the order of the lifecycle", async () => {
        await using page = await RogerPageHarness.launch({
            entries: [
                shown(aapl, entryOf(aapl, RogerState.SellOrder, 120)),
                shown(aapl, entryOf(aapl, RogerState.Watching, 100)),
                shown(aapl, entryOf(aapl, RogerState.Invested, 130)),
            ],
        });

        await page.sortBy("State");

        expect(page.listedEntries().map(({ state }) => state)).toEqual([
            "Watching",
            "Invested",
            "Sell order",
        ]);
    });

    it("lists the sold entries flat in the history, each offering re-entry and no transition", async () => {
        await using page = await RogerPageHarness.launch({
            view: "history",
            entries: [
                shown(msft, entryOf(msft, RogerState.Sold, 310)),
                shown(aapl, entryOf(aapl, RogerState.Sold, 150)),
            ],
        });

        const entries = page.listedEntries();
        expect(entries.map(({ symbol, state }) => [symbol, state])).toEqual([
            ["MSFT", "Sold"],
            ["AAPL", "Sold"],
        ]);
        for (const { actions } of entries) {
            expect(actions).toEqual(["Edit", "Re-enter", "Delete"]);
        }
        expect(page.currentView()).toBe("History");
        expect(page.hasFilter()).toBe(false);
    });

    it("loads the list of the view the user switches to", async () => {
        const sold = entryOf(aapl, RogerState.Sold, 150);
        await using page = await RogerPageHarness.launch({
            entries: [shown(aapl, entryOf(aapl, RogerState.Invested, 130))],
        });
        const list = page.givenEntries([shown(aapl, sold)]);

        await page.showView("history");

        expect(list.calls).toEqual([["history"]]);
        expect(page.currentView()).toBe("History");
        expect(page.listedEntries().map(({ state }) => state)).toEqual(["Sold"]);

        await page.showView("active");

        expect(list.calls).toEqual([["history"], ["active"]]);
        expect(page.currentView()).toBe("Active");
    });

    it("invites the user to add a first entry when there is none", async () => {
        await using page = await RogerPageHarness.launch();

        expect(page.emptyMessage()).toBe("No active entries yet.");
    });

    it("says there is no sold entry when the history is empty", async () => {
        await using page = await RogerPageHarness.launch({ view: "history" });

        expect(page.emptyMessage()).toBe("No sold entries yet.");
    });

    it("deletes an entry only after the user confirms", async () => {
        const entry = entryOf(aapl, RogerState.Watching, 100);
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, entry)] });
        const deletion = page.givenDeleteSucceeds();

        await page.deleteEntry(entry, { confirmed: false });

        expect(deletion.calls).toEqual([]);

        await page.deleteEntry(entry, { confirmed: true });

        expect(deletion.calls).toEqual([[entry.id]]);
    });

    it("shows in the row why a deletion failed", async () => {
        const entry = entryOf(aapl, RogerState.Watching, 100);
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, entry)] });
        page.givenDeleteFails(new EntryNotFoundError(entry.id));

        await page.deleteEntry(entry);

        expect(page.rowError(entry)).toBe(`Entry not found: ${entry.id}`);
    });

    it("pre-fills the transition to a buy order with the entry price and asks an empty quantity", async () => {
        const entry = entryOf(aapl, RogerState.Shortlisted, 150);
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, entry)] });

        await page.openTransitionForm(entry, RogerState.BuyOrder);

        expect(page.moveMenuIsOpen()).toBe(false);
        expect(page.formTitle()).toBe("Move AAPL to Buy order");
        expect(page.formContent()).toEqual([
            { label: "Entry price", value: "150", editable: true },
            { label: "Quantity", value: "", editable: true },
        ]);
    });

    it("pre-fills the transition to sold with the exit price, the buy commission as sell commission and today as sell date", async () => {
        const entry = makeEntry({
            instrumentId: aapl.id,
            state: RogerState.SellOrder,
            buyCommission: 2,
            exitPrice: 180,
        });
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, entry)] });

        await page.openTransitionForm(entry, RogerState.Sold);

        const asked = page.formContent();
        expect(
            asked.filter(({ label }) => /^(?:Exit price|Sell commission|Sell date)$/.test(label)),
        ).toEqual([
            { label: "Exit price", value: "180", editable: true },
            { label: "Sell commission", value: "2", editable: true },
            { label: "Sell date", value: today(), editable: true },
        ]);
    });

    it("asks the create form the fields of the initial state chosen", async () => {
        await using page = await RogerPageHarness.launch({ instruments: [aapl] });

        await page.openCreateForm();
        await page.fillForm({ "Initial state": RogerState.Invested });

        expect(page.formContent().map(({ label }) => label)).toEqual([
            "Symbol",
            "Initial state",
            "Entry price",
            "Quantity",
            "Buy commission",
            "Buy date",
        ]);
        expect(page.formContent().find(({ label }) => label === "Buy date")?.value).toBe(today());
    });

    it("makes the sell commission follow the buy commission while they are equal", async () => {
        await using page = await RogerPageHarness.launch({ instruments: [aapl] });

        await page.openCreateForm();
        await page.fillForm({ "Initial state": RogerState.Sold, "Buy commission": "3" });

        const sellCommission = page.formContent().find(({ label }) => label === "Sell commission");
        expect(sellCommission?.value).toBe("3");
    });

    it("names the catalog instrument the symbol typed matches, whatever its case", async () => {
        await using page = await RogerPageHarness.launch({ instruments: [aapl] });

        await page.openCreateForm();
        await page.fillForm({ Symbol: "aapl" });

        expect(page.symbolNote()).toBe(aapl.name);
        expect(page.formContent().map(({ label }) => label)).not.toContain("Name");
    });

    it("offers a new stock with a name and an optional sector when the symbol is not in the catalog", async () => {
        await using page = await RogerPageHarness.launch({ instruments: [aapl] });

        await page.openCreateForm();
        await page.fillForm({ Symbol: "ASTS" });

        expect(page.symbolNote()).toBe("ASTS is not in the catalog. Add it as a new stock.");
        const labels = page.formContent().map(({ label }) => label);
        expect(labels).toContain("Name");
        expect(labels).toContain("Sector");
        expect(page.formContent().find(({ label }) => label === "Sector")?.value).toBe("");
    });

    it("shows the field the server refuses inline and keeps the form open", async () => {
        await using page = await RogerPageHarness.launch({ instruments: [aapl] });
        page.givenCreateFails(new MissingRequiredFieldError("quantity"));

        await page.openCreateForm();
        await page.fillForm({
            Symbol: "AAPL",
            "Initial state": RogerState.Invested,
            "Entry price": "150",
        });
        await page.submitForm();

        expect(page.formIsOpen()).toBe(true);
        expect(page.formErrors()).toEqual({
            message: undefined,
            fields: { Quantity: "Missing required field: quantity" },
        });
    });

    it("asks a re-entry the entry price and quantity of the sold entry, pre-filled", async () => {
        const sold = makeEntry({
            instrumentId: aapl.id,
            state: RogerState.Sold,
            entryPrice: 150,
            quantity: 7,
        });
        await using page = await RogerPageHarness.launch({
            view: "history",
            entries: [shown(aapl, sold)],
        });

        await page.openReEntryForm(sold);

        expect(page.formTitle()).toBe("Re-enter AAPL");
        expect(page.formContent()).toEqual([
            { label: "Entry price", value: "150", editable: true },
            { label: "Quantity", value: "7", editable: true },
        ]);
    });

    it("asks the edit form the fields of the entry's current state, pre-filled", async () => {
        const entry = makeEntry({
            instrumentId: aapl.id,
            state: RogerState.Invested,
            entryPrice: 130,
            quantity: 5,
            buyCommission: 1.5,
            buyDate: "2026-09-15",
        });
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, entry)] });

        await page.openEditForm(entry);

        expect(page.formTitle()).toBe("Edit AAPL entry");
        expect(page.formContent()).toEqual([
            { label: "Entry price", value: "130", editable: true },
            { label: "Quantity", value: "5", editable: true },
            { label: "Buy commission", value: "1.5", editable: true },
            { label: "Buy date", value: "2026-09-15", editable: true },
        ]);
    });

    it("closes the form when the user cancels it", async () => {
        const entry = entryOf(aapl, RogerState.Watching, 100);
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, entry)] });

        await page.openEditForm(entry);
        await page.cancelForm();

        expect(page.formIsOpen()).toBe(false);
    });

    it("creates an entry for an instrument in the catalog", async () => {
        await using page = await RogerPageHarness.launch({ instruments: [aapl] });
        const creation = page.givenCreateSucceeds(makeEntry());

        await page.openCreateForm();
        await page.fillForm({ Symbol: "aapl", "Entry price": "150" });
        await page.submitForm();

        expect(creation.calls).toEqual([
            [{ state: RogerState.Watching, entryPrice: 150, instrumentId: aapl.id }],
        ]);
        expect(page.formIsOpen()).toBe(false);
    });

    it("creates an entry together with a new stock", async () => {
        await using page = await RogerPageHarness.launch({ instruments: [aapl] });
        const creation = page.givenCreateSucceeds(makeEntry());

        await page.openCreateForm();
        await page.fillForm({
            Symbol: "ASTS",
            Name: "AST SpaceMobile",
            Sector: Sector.Technology,
            "Entry price": "20.5",
        });
        await page.submitForm();

        expect(creation.calls).toEqual([
            [
                {
                    state: RogerState.Watching,
                    entryPrice: 20.5,
                    newInstrument: {
                        symbol: "ASTS",
                        name: "AST SpaceMobile",
                        sector: Sector.Technology,
                    },
                },
            ],
        ]);
    });

    it("creates a new stock without a sector when none is picked", async () => {
        await using page = await RogerPageHarness.launch();
        const creation = page.givenCreateSucceeds(makeEntry());

        await page.openCreateForm();
        await page.fillForm({ Symbol: "ASTS", Name: "AST SpaceMobile", "Entry price": "20" });
        await page.submitForm();

        expect(creation.calls).toEqual([
            [
                {
                    state: RogerState.Watching,
                    entryPrice: 20,
                    newInstrument: { symbol: "ASTS", name: "AST SpaceMobile" },
                },
            ],
        ]);
    });

    it("updates an entry with the fields of its state, quoting the version it loaded", async () => {
        const entry = makeEntry({
            instrumentId: aapl.id,
            state: RogerState.Invested,
            entryPrice: 130,
            quantity: 5,
            buyCommission: 1.5,
            buyDate: "2026-09-15",
        });
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, entry)] });
        const edit = page.givenEditSucceeds(entry);

        await page.openEditForm(entry);
        await page.fillForm({ Quantity: "12" });
        await page.submitForm();

        expect(edit.calls).toEqual([
            [
                { id: entry.id, state: RogerState.Invested, updatedAt: entry.updatedAt },
                { entryPrice: 130, quantity: 12, buyCommission: 1.5, buyDate: "2026-09-15" },
            ],
        ]);
        expect(page.formIsOpen()).toBe(false);
    });

    it("transitions an entry to the target state with the fields typed", async () => {
        const entry = entryOf(aapl, RogerState.Shortlisted, 150);
        await using page = await RogerPageHarness.launch({ entries: [shown(aapl, entry)] });
        const transition = page.givenTransitionSucceeds(entry);

        await page.openTransitionForm(entry, RogerState.BuyOrder);
        await page.fillForm({ Quantity: "5" });
        await page.submitForm();

        expect(transition.calls).toEqual([
            [
                { id: entry.id, state: RogerState.Shortlisted, updatedAt: entry.updatedAt },
                RogerState.BuyOrder,
                { entryPrice: 150, quantity: 5 },
            ],
        ]);
        expect(page.formIsOpen()).toBe(false);
    });

    it("re-enters a sold entry with the entry price and quantity typed", async () => {
        const sold = makeEntry({
            instrumentId: aapl.id,
            state: RogerState.Sold,
            entryPrice: 150,
            quantity: 7,
        });
        await using page = await RogerPageHarness.launch({
            view: "history",
            entries: [shown(aapl, sold)],
        });
        const reEntry = page.givenReEnterSucceeds(makeEntry());

        await page.openReEntryForm(sold);
        await page.fillForm({ "Entry price": "160" });
        await page.submitForm();

        expect(reEntry.calls).toEqual([
            [
                { id: sold.id, state: RogerState.Sold },
                { entryPrice: 160, quantity: 7 },
            ],
        ]);
        expect(page.formIsOpen()).toBe(false);
    });
});
