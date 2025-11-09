/**
 * Represents a value that can be either of type T or undefined.
 * @template T - The base type
 * @example
 * ```ts
 * type UndefinableString = Undefinable<string>; // string | undefined
 * const value: UndefinableString = undefined; // valid
 * const value2: UndefinableString = "hello"; // valid
 * ```
 */
export type Undefinable<T> = T | undefined;

/**
 * Represents a value that cannot be undefined (excludes undefined from T).
 * @template T - The base type
 * @example
 * ```ts
 * type NonUndefinableString = NonUndefinable<string | undefined>; // string
 * const value: NonUndefinableString = "hello"; // valid
 * // const invalid: NonUndefinableString = undefined; // error
 * ```
 */
export type NonUndefinable<T> = Exclude<T, undefined>;

/**
 * Type guard that checks if a value is undefined.
 * @param value - The value to check
 * @returns True if the value is undefined, false otherwise
 * @example
 * ```ts
 * const value: string | undefined = getOptionalValue();
 * if (isUndefinable(value)) {
 *   console.log("Value is undefined");
 * } else {
 *   console.log(value.toUpperCase()); // TypeScript knows value is string here
 * }
 * ```
 */
export function isUndefinable<T>(value: T | undefined): value is undefined {
    return value === undefined;
}

/**
 * Type guard that checks if a value is not undefined.
 * @param value - The value to check
 * @returns True if the value is not undefined, false otherwise
 * @example
 * ```ts
 * const values: (string | undefined)[] = ["hello", undefined, "world"];
 * const definedValues = values.filter(isNonUndefinable); // string[]
 * ```
 */
export function isNonUndefinable<T>(
    value: T | undefined
): value is NonUndefinable<T> {
    return value !== undefined;
}
