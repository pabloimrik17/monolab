import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getMenu, getSessionByCode } from "../server/data.ts";
import { createOrder } from "../server/mutations.ts";
import type { MenuItemDto } from "@m0n0lab/qup-shared";

export interface CartItem {
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    customization: string;
}

@injectable()
export class CreateOrderViewModel extends BaseViewModel {
    private readonly _error = createSignal("");
    private readonly _loading = createSignal(false);
    private readonly _menu = createSignal<MenuItemDto[]>([]);
    private readonly _cart = createSignal<CartItem[]>([]);
    private readonly _submitted = createSignal(false);
    private readonly _closed = createSignal(false);
    private readonly _notes = createSignal("");
    private readonly _guestName = createSignal("");
    private _sessionCode = "";

    get error() {
        return this._error[0];
    }
    get loading() {
        return this._loading[0];
    }
    get menu() {
        return this._menu[0];
    }
    get cart() {
        return this._cart[0];
    }
    get submitted() {
        return this._submitted[0];
    }
    get closed() {
        return this._closed[0];
    }
    get notes() {
        return this._notes[0];
    }
    get guestName() {
        return this._guestName[0];
    }

    setSessionCode(code: string): void {
        this._sessionCode = code;
    }

    setGuestName(name: string): void {
        this._guestName[1](name);
    }

    setNotes(notes: string): void {
        this._notes[1](notes);
    }

    addToCart(item: MenuItemDto): void {
        const current = this._cart[0]();
        const existing = current.find((c) => c.menuItemId === item.id);
        if (existing) {
            this._cart[1](
                current.map((c) =>
                    c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c,
                ),
            );
        } else {
            this._cart[1]([
                ...current,
                {
                    menuItemId: item.id,
                    menuItemName: item.name,
                    quantity: 1,
                    customization: "",
                },
            ]);
        }
    }

    removeFromCart(menuItemId: string): void {
        this._cart[1](this._cart[0]().filter((c) => c.menuItemId !== menuItemId));
    }

    updateCustomization(menuItemId: string, customization: string): void {
        this._cart[1](
            this._cart[0]().map((c) => (c.menuItemId === menuItemId ? { ...c, customization } : c)),
        );
    }

    override async didMount(): Promise<void> {
        this._loading[1](true);
        try {
            const [session, menu] = await Promise.all([
                getSessionByCode(this._sessionCode),
                getMenu(),
            ]);
            this._menu[1](menu);
            if (session.status === "CLOSED") {
                this._closed[1](true);
            }
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to load menu");
        } finally {
            this._loading[1](false);
        }
    }

    async submitOrder(): Promise<void> {
        this._error[1]("");
        this._loading[1](true);
        try {
            const cart = this._cart[0]();
            const notes = this._notes[0]();
            await createOrder({
                sessionCode: this._sessionCode,
                guestName: this._guestName[0](),
                items: cart.map((c) => ({
                    menuItemId: c.menuItemId,
                    quantity: c.quantity,
                    ...(c.customization && { customization: c.customization }),
                })),
                ...(notes && { notes }),
            });
            this._submitted[1](true);
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to submit order");
        } finally {
            this._loading[1](false);
        }
    }
}
