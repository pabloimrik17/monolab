import { readEnv } from "../shared/read-env.ts";
import type { ServerConfig } from "./config.ts";

function parsePort(raw: string): number {
    const port = Number(raw);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error(`Invalid PORT: ${raw}`);
    }
    return port;
}

/** `ServerConfig` from `process.env`, which `varlock/auto-load` has already resolved and validated. */
export class ProcessEnvConfig implements ServerConfig {
    readonly database: ServerConfig["database"];
    readonly redis: ServerConfig["redis"];
    readonly finnhub: ServerConfig["finnhub"];
    readonly api: ServerConfig["api"];

    constructor() {
        const env = readEnv(process.env, [
            "DATABASE_URL",
            "REDIS_URL",
            "FINNHUB_API_KEY",
            "PORT",
            "INVESTLAB_API_TOKEN",
        ]);
        this.database = { url: env.DATABASE_URL };
        this.redis = { url: env.REDIS_URL };
        this.finnhub = { apiKey: env.FINNHUB_API_KEY };
        this.api = { port: parsePort(env.PORT), token: env.INVESTLAB_API_TOKEN };
    }
}
