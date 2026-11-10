import { errAsync, okAsync } from "neverthrow";
import { userEvent, type Locator } from "vitest/browser";
import { WebHarness } from "#core/harness/web.harness";
import * as rogerRoute from "#routes/roger";
import { CATALOG } from "@m0n0lab/investlab-catalog/client";
import { RogerState } from "@m0n0lab/investlab-roger";
import { ROGER } from "@m0n0lab/investlab-roger/client";
import type { Instrument } from "@m0n0lab/investlab-catalog";
import type {
    Entry,
    EntryListView,
    EntryWithInstrument,
    RogerRemoteError,
} from "@m0n0lab/investlab-roger";

export interface RogerLaunchOptions {
    readonly view?: EntryListView;
    readonly entries?: EntryWithInstrument[];
    readonly instruments?: Instrument[];
}

export interface ListedEntry {
    /** Only the history lists the symbol in the row. */
    readonly symbol: string | undefined;
    readonly state: string;
    readonly entryPrice: string;
    readonly quantity: string;
    readonly buyCommission: string;
    readonly buyDate: string;
    readonly exitPrice: string;
    readonly sellCommission: string;
    readonly sellDate: string;
    readonly actions: string[];
}

export interface ListedGroup {
    readonly symbol: string;
    readonly entries: ListedEntry[];
}

type FormFieldLabel =
    | "Symbol"
    | "Name"
    | "Sector"
    | "Initial state"
    | "Entry price"
    | "Quantity"
    | "Buy commission"
    | "Buy date"
    | "Exit price"
    | "Sell commission"
    | "Sell date";

/** A select takes its option's value. */
export type FormEntry = Partial<Record<FormFieldLabel, string>>;

export interface FormControl {
    readonly label: string;
    readonly value: string;
    readonly editable: boolean;
}

export interface FormErrors {
    readonly message: string | undefined;
    readonly fields: Record<string, string>;
}

const STATE_LABELS: Record<RogerState, string> = {
    [RogerState.Watching]: "Watching",
    [RogerState.Shortlisted]: "Shortlisted",
    [RogerState.TraderBought]: "Trader bought",
    [RogerState.BuyOrder]: "Buy order",
    [RogerState.Invested]: "Invested",
    [RogerState.SellOrder]: "Sell order",
    [RogerState.Sold]: "Sold",
};

function nameOf(element: Element): string {
    const copy = element.cloneNode(true) as Element;
    for (const hidden of copy.querySelectorAll("[aria-hidden=true]")) {
        hidden.remove();
    }
    return text(copy);
}

const isMenuItem = (element: Element) => element.closest(".roger-menu") !== null;

const text = (element: Element | undefined) => element?.textContent?.trim() ?? "";

export class RogerPageHarness extends WebHarness {
    static launch({
        view = "active",
        entries = [],
        instruments = [],
    }: RogerLaunchOptions = {}): Promise<RogerPageHarness> {
        return this.open(rogerRoute, {
            url: view === "history" ? "/roger?view=history" : "/roger",
            setup: (page) => {
                page.givenEntries(entries);
                page.givenInstruments(instruments);
            },
        });
    }

    givenEntries(entries: EntryWithInstrument[]) {
        return this.fake(ROGER.EntryList, okAsync(entries));
    }

    givenInstruments(instruments: Instrument[]) {
        return this.fake(CATALOG.InstrumentList, okAsync(instruments));
    }

    givenCreateSucceeds(created: Entry) {
        return this.fake(ROGER.EntryCreate, okAsync(created));
    }

    givenCreateFails(error: RogerRemoteError) {
        return this.fake(ROGER.EntryCreate, errAsync(error));
    }

    givenEditSucceeds(edited: Entry) {
        return this.fake(ROGER.EntryEdit, okAsync(edited));
    }

    givenTransitionSucceeds(moved: Entry) {
        return this.fake(ROGER.EntryTransition, okAsync(moved));
    }

    givenReEnterSucceeds(reEntered: Entry) {
        return this.fake(ROGER.EntryReEnter, okAsync(reEntered));
    }

    givenDeleteSucceeds() {
        return this.fake(ROGER.EntryDelete, okAsync(undefined));
    }

    givenDeleteFails(error: RogerRemoteError) {
        return this.fake(ROGER.EntryDelete, errAsync(error));
    }

    async showView(view: EntryListView): Promise<void> {
        const name = view === "history" ? "History" : "Active";
        await this.interact(() => this.view.getByRole("link", { name, exact: true }).click());
    }

    async filterByState(state: RogerState | ""): Promise<void> {
        await this.interact(() =>
            this.view.getByRole("combobox", { name: "Filter by state" }).selectOptions(state),
        );
    }

    async sortBy(column: string): Promise<void> {
        await this.interact(() =>
            this.view.getByRole("button", { name: column, exact: true }).click(),
        );
    }

    async openCreateForm(): Promise<void> {
        await this.interact(() => this.view.getByRole("button", { name: "Add entry" }).click());
    }

    async openEditForm(entry: Entry): Promise<void> {
        await this.interact(() => this.actionOf(entry, "Edit").click());
    }

    async openTransitionForm(entry: Entry, to: RogerState): Promise<void> {
        await this.openMoveMenu(entry);
        await this.interact(() =>
            this.rowOf(entry).getByRole("button", { name: STATE_LABELS[to], exact: true }).click(),
        );
    }

    async openMoveMenu(entry: Entry): Promise<void> {
        await this.interact(() => this.actionOf(entry, "Move to").click());
    }

    async pressEscape(): Promise<void> {
        await this.interact(() => userEvent.keyboard("{Escape}"));
    }

    /** Scroll does not bubble, so only a capturing listener hears it from the table's own scroller. */
    async scrollTable(): Promise<void> {
        await this.interact(async () => {
            document.querySelector(".roger-table-scroll")?.dispatchEvent(new Event("scroll"));
        });
    }

    async tab(times = 1): Promise<void> {
        for (let i = 0; i < times; i++) {
            await this.interact(() => userEvent.tab());
        }
    }

    async pressEnter(): Promise<void> {
        await this.interact(() => userEvent.keyboard("{Enter}"));
    }

    async visibleMenuItems(): Promise<string[]> {
        return this.visible(this.view.getByRole("button")).filter(isMenuItem).map(text);
    }

    async transitionsOf(entry: Entry): Promise<string[]> {
        await this.openMoveMenu(entry);
        const items = await this.visibleMenuItems();
        await this.pressEscape();
        return items;
    }

    moveMenuIsOpen(): boolean {
        return this.visible(this.view.getByRole("button")).some(isMenuItem);
    }

    async openReEntryForm(entry: Entry): Promise<void> {
        await this.interact(() => this.actionOf(entry, "Re-enter").click());
    }

    async fillForm(entry: FormEntry): Promise<void> {
        await this.interact(async () => {
            for (const [label, value] of Object.entries(entry)) {
                const field = this.field(label);
                const [element] = field.elements();
                if (element instanceof HTMLSelectElement) {
                    await field.selectOptions(value);
                } else {
                    await field.fill(value);
                }
            }
        });
    }

    async submitForm(): Promise<void> {
        await this.interact(() =>
            this.view.getByRole("button", { name: /^(Add entry|Save changes|Confirm)$/ }).click(),
        );
    }

    async cancelForm(): Promise<void> {
        await this.interact(() => this.view.getByRole("button", { name: "Cancel" }).click());
    }

    async deleteEntry(entry: Entry, { confirmed = true } = {}): Promise<void> {
        const button = this.actionOf(entry, "Delete");
        await this.interact(() => this.answeringConfirm(confirmed, () => button.click()));
    }

    currentView(): string | undefined {
        const [current] = this.visible(
            this.view.getByRole("navigation", { name: "Roger view" }).getByRole("link"),
        ).filter((link) => link.getAttribute("aria-current") === "page");
        return current ? text(current) : undefined;
    }

    listedGroups(): ListedGroup[] {
        return this.visible(this.view.getByRole("rowgroup"))
            .filter((group) => group.tagName === "TBODY")
            .map((group) => ({
                symbol: text(group.querySelector("h2") ?? undefined),
                entries: [...group.querySelectorAll("tr")]
                    .filter((row) => row.querySelector("h2") === null)
                    .map((row) => this.listedEntry(row)),
            }));
    }

    listedEntries(): ListedEntry[] {
        return this.listedGroups().flatMap(({ entries }) => entries);
    }

    groupedSymbols(): string[] {
        return this.listedGroups().map(({ symbol }) => symbol);
    }

    emptyMessage(): string | undefined {
        const [message] = this.visible(
            this.view.getByText(/^No (?:active|sold) entries yet\.$|^No entries in /),
        );
        return message ? text(message) : undefined;
    }

    sortDirection(column: string): string | undefined {
        const [header] = this.visible(this.view.getByRole("columnheader", { name: column }));
        return header?.getAttribute("aria-sort") ?? undefined;
    }

    hasFilter(): boolean {
        return (
            this.visible(this.view.getByRole("combobox", { name: "Filter by state" })).length > 0
        );
    }

    formIsOpen(): boolean {
        return this.form !== undefined;
    }

    formTitle(): string | undefined {
        return text(this.form?.querySelector("h2") ?? undefined) || undefined;
    }

    formContent(): FormControl[] {
        return [...(this.form?.querySelectorAll("input:not([type=hidden]),select") ?? [])].map(
            (control) => {
                const input = control as HTMLInputElement | HTMLSelectElement;
                return {
                    label: this.labelOf(input),
                    value: input.value,
                    editable:
                        !input.disabled && !(input instanceof HTMLInputElement && input.readOnly),
                };
            },
        );
    }

    symbolNote(): string | undefined {
        return text(this.form?.querySelector(".roger-form-note") ?? undefined) || undefined;
    }

    formErrors(): FormErrors {
        const { form } = this;
        const fields: Record<string, string> = {};
        for (const label of form?.querySelectorAll("label") ?? []) {
            const message = label.querySelector(".form-error")?.textContent;
            if (message) {
                fields[label.firstChild?.textContent?.trim() ?? ""] = message;
            }
        }
        return { message: form?.querySelector("p.form-error")?.textContent ?? undefined, fields };
    }

    rowError(entry: Entry): string | undefined {
        const [row] = this.visible(this.rowOf(entry));
        return row?.querySelector(".form-error")?.textContent ?? undefined;
    }

    private listedEntry(row: Element): ListedEntry {
        const cells = [...row.querySelectorAll(":scope > td")];
        const symbolCell = cells[0]?.querySelector("code") ? cells.shift() : undefined;
        const [
            state,
            entryPrice,
            quantity,
            buyCommission,
            buyDate,
            exitPrice,
            sellCommission,
            sellDate,
            actions,
        ] = cells;
        return {
            symbol: symbolCell ? text(symbolCell) : undefined,
            state: text(state?.querySelector(".badge") ?? undefined),
            entryPrice: text(entryPrice),
            quantity: text(quantity),
            buyCommission: text(buyCommission),
            buyDate: text(buyDate),
            exitPrice: text(exitPrice),
            sellCommission: text(sellCommission),
            sellDate: text(sellDate),
            actions: [...(actions?.querySelectorAll("button") ?? [])]
                .filter((button) => button.checkVisibility())
                .map(nameOf),
        };
    }

    private rowOf(entry: Entry): Locator {
        const name = new RegExp(`^(?:[A-Z]+ )?${STATE_LABELS[entry.state]} ${entry.entryPrice}\\b`);
        return this.view.getByRole("row", { name });
    }

    private actionOf(entry: Entry, name: string): Locator {
        return this.rowOf(entry).getByRole("button", { name, exact: true });
    }

    private field(label: string): Locator {
        return this.view.getByLabelText(label, { exact: false });
    }

    private labelOf(control: Element): string {
        return control.closest("label")?.firstChild?.textContent?.trim() ?? "";
    }

    /** The form's Cancel button is the one control only an open form has. */
    private get form(): HTMLFormElement | undefined {
        const [cancel] = this.visible(this.view.getByRole("button", { name: "Cancel" }));
        return cancel?.closest("form") ?? undefined;
    }
}
