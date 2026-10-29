import { injectable } from "inversify";

/** Text storage by key; the typed reads return no value when the key is missing or unreadable. */
export interface KeyValueStorage {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    remove(key: string): void;
    getNumber(key: string): number | undefined;
    setNumber(key: string, value: number): void;
    getObject<T>(key: string): T | undefined;
    setObject(key: string, value: unknown): void;
}

/** The typed helpers, written once on top of the text methods an implementation provides. */
@injectable()
export abstract class BaseKeyValueStorage implements KeyValueStorage {
    abstract get(key: string): string | undefined;
    abstract set(key: string, value: string): void;
    abstract remove(key: string): void;

    getNumber(key: string): number | undefined {
        const text = this.get(key);
        if (text === undefined || text.trim() === "") return undefined;
        const value = Number(text);
        return Number.isFinite(value) ? value : undefined;
    }

    setNumber(key: string, value: number): void {
        this.set(key, String(value));
    }

    /** The stored JSON is trusted to have the shape `T`; callers validate when it matters. */
    getObject<T>(key: string): T | undefined {
        const text = this.get(key);
        if (text === undefined) return undefined;
        try {
            return JSON.parse(text) as T;
        } catch {
            return undefined;
        }
    }

    setObject(key: string, value: unknown): void {
        this.set(key, JSON.stringify(value));
    }
}
