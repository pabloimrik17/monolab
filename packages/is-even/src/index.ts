import { isOdd } from "@monolab/is-odd";

/**
 * Checks if a number is even.
 * @param value - The number to check
 * @returns True if the number is even, false otherwise
 * @example
 * ```ts
 * isEven(2) // true
 * isEven(3) // false
 * ```
 */
export function isEven(value: number): boolean {
    return !isOdd(value);
}

/**
 * Checks if a number is not even (i.e., odd).
 * @param value - The number to check
 * @returns True if the number is not even (odd), false otherwise
 * @example
 * ```ts
 * isNotEven(3) // true
 * isNotEven(2) // false
 * ```
 */
export function isNotEven(value: number): boolean {
    return !isEven(value);
}
