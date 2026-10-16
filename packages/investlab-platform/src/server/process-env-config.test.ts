import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessEnvConfig } from "./process-env-config.ts";

const ENV = {
    DATABASE_URL: "postgres://investlab:investlab@localhost:5433/investlab",
    REDIS_URL: "redis://localhost:6379",
    FINNHUB_API_KEY: "finnhub-key",
    PORT: "3002",
    INVESTLAB_API_TOKEN: "api-token",
};

describe("ProcessEnvConfig", () => {
    beforeEach(() => {
        for (const [key, value] of Object.entries(ENV)) {
            vi.stubEnv(key, value);
        }
    });

    it("groups the API env keys by concern", () => {
        expect({ ...new ProcessEnvConfig() }).toEqual({
            database: { url: ENV.DATABASE_URL },
            redis: { url: ENV.REDIS_URL },
            finnhub: { apiKey: ENV.FINNHUB_API_KEY },
            api: { port: 3002, token: ENV.INVESTLAB_API_TOKEN },
        });
    });

    it("names every missing key at once", () => {
        vi.stubEnv("DATABASE_URL", undefined);
        vi.stubEnv("FINNHUB_API_KEY", "");

        expect(() => new ProcessEnvConfig()).toThrow(
            "Missing env vars: DATABASE_URL, FINNHUB_API_KEY",
        );
    });

    it.each(["abc", "0", "65536", "80.5"])("rejects PORT=%s", (port) => {
        vi.stubEnv("PORT", port);

        expect(() => new ProcessEnvConfig()).toThrow(`Invalid PORT: ${port}`);
    });
});
