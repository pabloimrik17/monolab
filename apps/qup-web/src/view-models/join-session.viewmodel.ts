import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { getMenu, getSessionByCode } from "../server/data.ts";
import type { MenuItemDto, SessionDto } from "@m0n0lab/qup-shared";

@injectable()
export class JoinSessionViewModel extends BaseViewModel {
    private readonly _loading = createSignal(false);
    private readonly _error = createSignal("");
    private readonly _session = createSignal<SessionDto | undefined>(undefined);
    private readonly _menu = createSignal<MenuItemDto[]>([]);
    private readonly _guestName = createSignal("");
    private _code = "";

    get loading() {
        return this._loading[0];
    }
    get error() {
        return this._error[0];
    }
    get session() {
        return this._session[0];
    }
    get menu() {
        return this._menu[0];
    }
    get guestName() {
        return this._guestName[0];
    }

    setCode(code: string): void {
        this._code = code;
    }

    setGuestName(name: string): void {
        this._guestName[1](name);
    }

    override async didMount(): Promise<void> {
        if (!this._code) {
            this._error[1]("Session code is required");
            return;
        }
        this._loading[1](true);
        try {
            const [session, menu] = await Promise.all([getSessionByCode(this._code), getMenu()]);
            this._session[1](session);
            this._menu[1](menu);
        } catch (e) {
            this._error[1](e instanceof Error ? e.message : "Failed to load session");
        } finally {
            this._loading[1](false);
        }
    }
}
