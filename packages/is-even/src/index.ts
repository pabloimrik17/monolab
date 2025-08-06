import { isOdd } from "@monolab/is-odd";

/**
 * Checks if a number is even.
 * @param value - The number to check
 * @returns True if the number is even, false otherwise
 */
export function isEven(value: number): boolean {
    return !isOdd(value);
}

export function isNotEven(value: number): boolean {
    return !isEven(value);
}
