import { injectable } from "inversify";
import { Result } from "neverthrow";
import type { z } from "zod";

/** Text storage by key; the typed reads return no value when the key is missing or unreadable. */
export interface KeyValueStorage {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    remove(key: string): void;
    getNumber(key: string): number | undefined;
    setNumber(key: string, value: number): void;
    getObject<T>(key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T | undefined;
    setObject(key: string, value: unknown): void;
}

const parseJson = Result.fromThrowable(
    (text: string): unknown => JSON.parse(text),
    (cause) => cause,
);

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

    /** Missing, unparsable or schema-mismatched data reads as `undefined`. */
    getObject<T>(key: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T | undefined {
        const text = this.get(key);
        if (text === undefined) return undefined;

        return parseJson(text)
            .map((json) => schema.safeParse(json))
            .match(
                (parsed) => (parsed.success ? parsed.data : undefined),
                () => undefined,
            );
    }

    setObject(key: string, value: unknown): void {
        this.set(key, JSON.stringify(value));
    }
}
