import { injectable } from "inversify";
import { BaseKeyValueStorage } from "../../shared/storage/key-value.storage.ts";

/** The part of the DOM `Storage` used here; this package compiles without the DOM lib. */
interface WebStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/** Over `window.localStorage`, read on each call so the class loads where there is none. */
@injectable()
export class LocalStorage extends BaseKeyValueStorage {
    get(key: string): string | undefined {
        return this.storage().getItem(key) ?? undefined;
    }

    set(key: string, value: string): void {
        this.storage().setItem(key, value);
    }

    remove(key: string): void {
        this.storage().removeItem(key);
    }

    private storage(): WebStorage {
        return (globalThis as unknown as { localStorage: WebStorage }).localStorage;
    }
}
