/**
 * Extracts only the string keys from a type, filtering out numeric and symbol keys.
 * This is useful when you need to work with only string-based property names,
 * particularly in scenarios involving typed object manipulation, configuration objects,
 * and API parameter handling.
 *
 * Unlike `keyof T` which returns all keys (string | number | symbol), `StringKeyOf<T>`
 * returns only keys that are of type string.
 *
 * @template T - The source object type
 *
 * @example
 * ```ts
 * interface User {
 *   id: string;
 *   name: string;
 *   age: number;
 * }
 *
 * // All keys are strings
 * type UserKeys = StringKeyOf<User>; // "id" | "name" | "age"
 * ```
 *
 * @example
 * ```ts
 * interface MixedKeys {
 *   stringKey: string;
 *   42: number;  // numeric key
 *   [Symbol.iterator]: () => void;  // symbol key
 * }
 *
 * // Only string keys are extracted
 * type OnlyStrings = StringKeyOf<MixedKeys>; // "stringKey"
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
 * // Use with type-safe object manipulation
 * function getConfigValue<K extends StringKeyOf<Config>>(
 *   config: Config,
 *   key: K
 * ): Config[K] {
 *   return config[key];
 * }
 * ```
 */
export type StringKeyOf<T> = Extract<keyof T, string>;
