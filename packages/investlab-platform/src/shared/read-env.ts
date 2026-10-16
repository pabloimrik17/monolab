type Env = Readonly<Record<string, string | undefined>>;

/** Reads `keys` from `env`; an unset or empty key is missing, and every missing key is named at once. */
export function readEnv<const Key extends string>(
    env: Env,
    keys: readonly Key[],
): Record<Key, string> {
    const missing = keys.filter((key) => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing env vars: ${missing.join(", ")}`);
    }
    return Object.fromEntries(keys.map((key) => [key, env[key]])) as Record<Key, string>;
}
