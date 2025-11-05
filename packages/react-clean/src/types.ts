/**
 * A stricter version of TypeScript's built-in `Omit` utility type.
 *
 * Unlike the standard `Omit<T, K>`, `StrictOmit<T, K>` enforces that all keys in `K`
 * must actually exist in `T`. This prevents typos and ensures type safety when
 * omitting properties from an object type.
 *
 * @typeParam T - The source object type from which properties will be omitted
 * @typeParam K - A union of keys that must exist in T to be omitted
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * // ✅ Valid: 'email' exists in User
 * type UserWithoutEmail = StrictOmit<User, 'email'>;
 * // Result: { id: string; name: string; }
 *
 * // ❌ Type error: 'age' does not exist in User
 * type Invalid = StrictOmit<User, 'age'>;
 * ```
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
