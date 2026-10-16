import { readEnv } from "../shared/read-env.ts";
import type { ClientConfig } from "./config.ts";

/**
 * `ClientConfig` from the SSR server's `process.env`. Varlock fills it: the Vite plugin's SSR init
 * (`initVarlockEnv`) in `react-router dev`, `varlock run` in `start`. Not the `ENV` proxy: the
 * plugin inlines non-sensitive `ENV.*` reads at build time, which would freeze the build's API URL.
 */
export class SsrEnvConfig implements ClientConfig {
    readonly api: ClientConfig["api"];

    constructor() {
        const env = readEnv(process.env, ["INVESTLAB_API_URL", "INVESTLAB_API_TOKEN"]);
        this.api = { baseUrl: env.INVESTLAB_API_URL, token: env.INVESTLAB_API_TOKEN };
    }
}
