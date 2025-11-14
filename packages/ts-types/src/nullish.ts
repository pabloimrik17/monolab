/**
 * Represents a value that can be either of type T, null, or undefined.
 * This is equivalent to TypeScript's optional chaining behavior.
 * @template T - The base type
 * @example
 * ```ts
 * type NullishString = Nullish<string>; // string | null | undefined
 * const value: NullishString = null; // valid
 * const value2: NullishString = undefined; // valid
 * const value3: NullishString = "hello"; // valid
 * ```
 */
export type Nullish<T> = T | null | undefined;

/**
 * Represents a value that cannot be null or undefined (excludes both from T).
 * @template T - The base type
 * @example
 * ```ts
 * type NonNullishString = NonNullish<string | null | undefined>; // string
 * const value: NonNullishString = "hello"; // valid
 * // const invalid: NonNullishString = null; // error
 * // const invalid2: NonNullishString = undefined; // error
 * ```
 */
export type NonNullish<T> = Exclude<T, null | undefined>;

/**
 * Type guard that checks if a value is nullish (null or undefined).
 * @param value - The value to check
 * @returns True if the value is null or undefined, false otherwise
 * @example
 * ```ts
 * const value: string | null | undefined = getOptionalValue();
 * if (isNullish(value)) {
 *   console.log("Value is nullish");
 * } else {
 *   console.log(value.toUpperCase()); // TypeScript knows value is string here
 * }
 * ```
 */
export function isNullish<T>(
    value: T | null | undefined
): value is null | undefined {
    return value === null || value === undefined;
}

/**
 * Type guard that checks if a value is not nullish (neither null nor undefined).
 * @param value - The value to check
 * @returns True if the value is neither null nor undefined, false otherwise
 * @example
 * ```ts
 * const values: (string | null | undefined)[] = ["hello", null, undefined, "world"];
 * const definedValues = values.filter(isNonNullish); // string[]
 * ```
 */
export function isNonNullish<T>(
    value: T | null | undefined
): value is NonNullish<T> {
    return value !== null && value !== undefined;
}
