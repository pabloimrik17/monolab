import { injectable } from "inversify";
import { BaseKeyValueStorage } from "./key-value.storage.ts";

/** For tests and server rendering, where there is no browser storage. */
@injectable()
export class MemoryStorage extends BaseKeyValueStorage {
    private readonly entries = new Map<string, string>();

    get(key: string): string | undefined {
        return this.entries.get(key);
    }

    set(key: string, value: string): void {
        this.entries.set(key, value);
    }

    remove(key: string): void {
        this.entries.delete(key);
    }
}
