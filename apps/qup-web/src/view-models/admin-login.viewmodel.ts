import { injectable } from "inversify";
import { createSignal } from "solid-js";
import { BaseViewModel } from "@m0n0lab/solid-clean";
import { login } from "../server/auth.ts";

@injectable()
export class AdminLoginViewModel extends BaseViewModel {
    private readonly _pin = createSignal("");
    private readonly _error = createSignal("");
    private readonly _loading = createSignal(false);
    private readonly _authenticated = createSignal(false);

    get pin() {
        return this._pin[0];
    }
    get error() {
        return this._error[0];
    }
    get loading() {
        return this._loading[0];
    }
    get authenticated() {
        return this._authenticated[0];
    }

    setPin(pin: string): void {
        this._pin[1](pin);
    }

    async submitLogin(): Promise<void> {
        this._error[1]("");
        this._loading[1](true);
        try {
            const result = await login(this._pin[0]());
            if (result.success) {
                this._authenticated[1](true);
            } else {
                this._error[1]("Invalid PIN");
            }
        } catch {
            this._error[1]("Login failed");
        } finally {
            this._loading[1](false);
        }
    }
}
