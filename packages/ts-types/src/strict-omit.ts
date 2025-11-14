/**
 * A stricter version of TypeScript's built-in Omit that enforces that the keys
 * being omitted actually exist in the source type. This helps catch typos and
 * ensures type safety when omitting properties.
 *
 * Unlike the built-in `Omit<T, K>` which accepts any string for K, `StrictOmit<T, K>`
 * requires K to be a key that actually exists in T (K extends keyof T).
 *
 * @template T - The source object type
 * @template K - The keys to omit (must be actual keys of T)
 *
 * @example
 * ```ts
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * // Valid: 'email' exists in User
 * type UserWithoutEmail = StrictOmit<User, 'email'>; // { id: string; name: string }
 *
 * // Error: 'age' does not exist in User
 * // type Invalid = StrictOmit<User, 'age'>; // TypeScript error
 *
 * // Built-in Omit would allow this (less safe):
 * type Unsafe = Omit<User, 'age'>; // No error, but 'age' doesn't exist
 * ```
 *
 * @example
 * ```ts
 * interface Config {
 *   host: string;
 *   port: number;
 *   debug: boolean;
 * }
 *
 * // Omit multiple keys
 * type ProductionConfig = StrictOmit<Config, 'debug'>; // { host: string; port: number }
 * type MinimalConfig = StrictOmit<Config, 'port' | 'debug'>; // { host: string }
 * ```
 */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
