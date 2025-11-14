/**
 * Represents a value that can be either of type T or null.
 * @template T - The base type
 * @example
 * ```ts
 * type NullableString = Nullable<string>; // string | null
 * const value: NullableString = null; // valid
 * const value2: NullableString = "hello"; // valid
 * ```
 */
export type Nullable<T> = T | null;

/**
 * Represents a value that cannot be null (excludes null from T).
 * @template T - The base type
 * @example
 * ```ts
 * type NonNullableString = NonNullable<string | null>; // string
 * const value: NonNullableString = "hello"; // valid
 * // const invalid: NonNullableString = null; // error
 * ```
 */
export type NonNullable<T> = Exclude<T, null>;

/**
 * Type guard that checks if a value is nullable (null or has null in its union).
 * @param value - The value to check
 * @returns True if the value is null, false otherwise
 * @example
 * ```ts
 * const value: string | null = getOptionalValue();
 * if (isNullable(value)) {
 *   console.log("Value is null");
 * } else {
 *   console.log(value.toUpperCase()); // TypeScript knows value is string here
 * }
 * ```
 */
export function isNullable<T>(value: T | null): value is null {
    return value === null;
}

/**
 * Type guard that checks if a value is not null.
 * @param value - The value to check
 * @returns True if the value is not null, false otherwise
 * @example
 * ```ts
 * const values: (string | null)[] = ["hello", null, "world"];
 * const nonNullValues = values.filter(isNonNullable); // string[]
 * ```
 */
export function isNonNullable<T>(value: T | null): value is NonNullable<T> {
    return value !== null;
}
