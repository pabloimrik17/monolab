import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getMenu } from "../server/data.ts";
import { createMenuItem, deleteMenuItem, updateMenuItem } from "../server/mutations.ts";
import type { MenuItemDto } from "@m0n0lab/qup-shared";

@injectable()
export class MenuManagementViewModel extends BaseViewModel {
    private readonly _loading = createSignal(false);
    private readonly _error = createSignal("");
    private readonly _items = createSignal<MenuItemDto[]>([]);
    private readonly _editingId = createSignal<string | null>(null);
    private readonly _formName = createSignal("");
    private readonly _formCategory = createSignal<string>("COFFEE");
    private readonly _formDescription = createSignal("");

    get loading() {
        return this._loading[0];
    }
    get error() {
        return this._error[0];
    }
    get items() {
        return this._items[0];
    }
    get editingId() {
        return this._editingId[0];
    }
    get formName() {
        return this._formName[0];
    }
    get formCategory() {
        return this._formCategory[0];
    }
    get formDescription() {
        return this._formDescription[0];
    }

    setFormName(name: string): void {
        this._formName[1](name);
    }
    setFormCategory(category: string): void {
        this._formCategory[1](category);
    }
    setFormDescription(description: string): void {
        this._formDescription[1](description);
    }

    override async didMount(): Promise<void> {
        this._loading[1](true);
        try {
            const items = await getMenu();
            this._items[1](items);
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to load menu");
        } finally {
            this._loading[1](false);
        }
    }

    async handleSave(): Promise<void> {
        const name = this._formName[0]().trim();
        if (!name) return;
        this._error[1]("");
        const category = this._formCategory[0]() as MenuItemDto["category"];
        const description = this._formDescription[0]().trim() || undefined;

        try {
            const editId = this._editingId[0]();
            if (editId) {
                const updated = await updateMenuItem(editId, {
                    name,
                    category,
                    description,
                });
                this._items[1]((prev) => prev.map((i) => (i.id === editId ? updated : i)));
            } else {
                const created = await createMenuItem({ name, category, description });
                this._items[1]((prev) => [...prev, created]);
            }
            this.resetForm();
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to save item");
        }
    }

    async handleToggleAvailability(item: MenuItemDto): Promise<void> {
        this._error[1]("");
        try {
            const updated = await updateMenuItem(item.id, { available: !item.available });
            this._items[1]((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to update availability");
        }
    }

    startEdit(item: MenuItemDto): void {
        this._editingId[1](item.id);
        this._formName[1](item.name);
        this._formCategory[1](item.category);
        this._formDescription[1](item.description ?? "");
    }

    resetForm(): void {
        this._editingId[1](null);
        this._formName[1]("");
        this._formCategory[1]("COFFEE");
        this._formDescription[1]("");
    }

    async handleDelete(itemId: string): Promise<void> {
        this._error[1]("");
        try {
            await deleteMenuItem(itemId);
            this._items[1]((prev) => prev.filter((i) => i.id !== itemId));
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to delete item");
        }
    }
}
