import { errAsync, okAsync } from "neverthrow";
import { WebHarness } from "#core/harness/web.harness";
import * as portfolioRoute from "#routes/portfolio";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/client";
import { makePortfolioItem } from "@m0n0lab/investlab-portfolio/testing";
import type { PortfolioItem } from "@m0n0lab/investlab-portfolio";
import type {
    PortfolioItemCreateError,
    PortfolioItemDeleteError,
    PortfolioItemList,
    PortfolioItemListError,
    PortfolioItemUpdateError,
} from "@m0n0lab/investlab-portfolio/client";
import type { Locator } from "vitest/browser";

export interface PortfolioLaunchOptions {
    readonly items?: PortfolioItemList["items"];
    readonly instruments?: PortfolioItemList["instruments"];
    readonly loadFails?: PortfolioItemListError;
}

export interface ListedItem {
    readonly name: string;
    readonly symbol: string;
    readonly type: string;
    readonly assetClass: string;
    readonly broker: string;
    readonly targetWeight: string;
    readonly currentValue: string;
    readonly replicates: string;
}

export interface ItemFormEntry {
    /** Id of the instrument to pick; the select is locked while editing. */
    readonly instrumentId?: string;
    readonly broker?: string;
    readonly targetWeight?: string;
    readonly currentValue?: string;
    readonly notes?: string;
}

export interface ItemFormContent {
    readonly instrumentId: string;
    readonly instrumentLocked: boolean;
    readonly broker: string;
    readonly targetWeight: string;
    readonly currentValue: string;
    readonly notes: string;
}

export interface ItemFormErrors {
    /** The general message under the fields, if any. */
    readonly message: string | undefined;
    /** Per-field messages, keyed by the field's label. */
    readonly fields: Record<string, string>;
}

type FormFieldName = "instrumentId" | "broker" | "targetWeight" | "currentValue" | "notes";

const fieldLabels: Record<FormFieldName, (view: Locator) => Locator> = {
    instrumentId: (view) => view.getByRole("combobox"),
    broker: (view) => view.getByLabelText("Broker", { exact: false }),
    targetWeight: (view) => view.getByLabelText("Target weight (%)", { exact: false }),
    currentValue: (view) => view.getByLabelText("Current value (€)", { exact: false }),
    notes: (view) => view.getByLabelText("Notes", { exact: false }),
};

export class PortfolioPageHarness extends WebHarness {
    static launch({
        items = [],
        instruments = [],
        loadFails,
    }: PortfolioLaunchOptions = {}): Promise<PortfolioPageHarness> {
        return this.open(portfolioRoute, {
            url: "/portfolio",
            setup: (page) => {
                if (loadFails) {
                    page.givenLoadFails(loadFails);
                } else {
                    page.givenItems(items, instruments);
                }
            },
        });
    }

    givenItems(
        items: PortfolioItemList["items"],
        instruments: PortfolioItemList["instruments"] = [],
    ) {
        return this.fake(PORTFOLIO.ItemList, okAsync({ items, instruments }));
    }

    givenLoadFails(error: PortfolioItemListError) {
        return this.fake(PORTFOLIO.ItemList, errAsync(error));
    }

    givenCreateSucceeds(created: PortfolioItem = makePortfolioItem()) {
        return this.fake(PORTFOLIO.ItemCreate, okAsync(created));
    }

    givenCreateFails(error: PortfolioItemCreateError) {
        return this.fake(PORTFOLIO.ItemCreate, errAsync(error));
    }

    givenUpdateSucceeds(updated: PortfolioItem = makePortfolioItem()) {
        return this.fake(PORTFOLIO.ItemUpdate, okAsync(updated));
    }

    givenUpdateFails(error: PortfolioItemUpdateError) {
        return this.fake(PORTFOLIO.ItemUpdate, errAsync(error));
    }

    givenDeleteSucceeds() {
        return this.fake(PORTFOLIO.ItemDelete, okAsync(undefined));
    }

    givenDeleteFails(error: PortfolioItemDeleteError) {
        return this.fake(PORTFOLIO.ItemDelete, errAsync(error));
    }

    async openAddForm(): Promise<void> {
        await this.interact(() => this.view.getByRole("button", { name: "Add item" }).click());
    }

    async openEditForm(symbol: string): Promise<void> {
        await this.interact(() => this.row(symbol).getByRole("button", { name: "Edit" }).click());
    }

    async fillForm(entry: ItemFormEntry): Promise<void> {
        await this.interact(async () => {
            if (entry.instrumentId !== undefined) {
                await this.field("instrumentId").selectOptions(entry.instrumentId);
            }
            const texts = [
                ["broker", entry.broker],
                ["targetWeight", entry.targetWeight],
                ["currentValue", entry.currentValue],
                ["notes", entry.notes],
            ] as const;
            for (const [name, text] of texts) {
                if (text !== undefined) {
                    await this.field(name).fill(text);
                }
            }
        });
    }

    async submitForm(): Promise<void> {
        await this.interact(() =>
            this.view.getByRole("button", { name: /^(Add item|Save changes)$/ }).click(),
        );
    }

    async deleteItem(symbol: string, { confirmed = true } = {}): Promise<void> {
        const button = this.row(symbol).getByRole("button", { name: "Delete" });
        await this.interact(() => this.answeringConfirm(confirmed, () => button.click()));
    }

    listedSymbols(): string[] {
        return this.visible(this.view.getByRole("row").getByRole("code")).map(
            (symbol) => symbol.textContent ?? "",
        );
    }

    listedItems(): ListedItem[] {
        return this.visible(this.view.getByRole("row"))
            .map((row) => [...row.querySelectorAll("td")].map((cell) => cell.textContent ?? ""))
            .filter((cells) => cells.length > 0)
            .map(
                ([
                    name,
                    symbol,
                    type,
                    assetClass,
                    broker,
                    targetWeight,
                    currentValue,
                    replicates,
                ]) => ({
                    name: name ?? "",
                    symbol: symbol ?? "",
                    type: type ?? "",
                    assetClass: assetClass ?? "",
                    broker: broker ?? "",
                    targetWeight: targetWeight ?? "",
                    currentValue: currentValue ?? "",
                    replicates: replicates ?? "",
                }),
            );
    }

    showsEmptyList(): boolean {
        return this.visible(this.view.getByText("No portfolio items yet.")).length > 0;
    }

    /** What the app's error page shows when the page fails to load. */
    errorPage(): { status: string; message: string } {
        const [main] = this.visible(this.view.getByRole("main"));
        return {
            status: main?.querySelector("h1")?.textContent ?? "",
            message: main?.querySelector("p")?.textContent ?? "",
        };
    }

    formIsOpen(): boolean {
        return this.form !== undefined;
    }

    formContent(): ItemFormContent {
        const read = (name: FormFieldName) => this.field(name).elements()[0] as HTMLInputElement;
        return {
            instrumentId: read("instrumentId").value,
            instrumentLocked: read("instrumentId").disabled,
            broker: read("broker").value,
            targetWeight: read("targetWeight").value,
            currentValue: read("currentValue").value,
            notes: read("notes").value,
        };
    }

    formErrors(): ItemFormErrors {
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

    /** The message shown in the row after a failed deletion. */
    rowError(symbol: string): string | undefined {
        const [row] = this.visible(this.row(symbol));
        return row?.querySelector(".form-error")?.textContent ?? undefined;
    }

    /** The form's Cancel button is the one control only an open form has. */
    private get cancelButton() {
        return this.view.getByRole("button", { name: "Cancel" });
    }

    private get form(): HTMLFormElement | undefined {
        const [cancel] = this.visible(this.cancelButton);
        return cancel?.closest("form") ?? undefined;
    }

    private field(name: FormFieldName) {
        return fieldLabels[name](this.view);
    }

    private row(symbol: string) {
        return this.view.getByRole("row").filter({ hasText: symbol });
    }
}
