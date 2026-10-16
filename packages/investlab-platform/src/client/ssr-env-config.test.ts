import { describe, expect, it, vi } from "vitest";
import { SsrEnvConfig } from "./ssr-env-config.ts";

describe("SsrEnvConfig", () => {
    it("groups the web env keys under api", () => {
        vi.stubEnv("INVESTLAB_API_URL", "http://localhost:3002");
        vi.stubEnv("INVESTLAB_API_TOKEN", "api-token");

        expect({ ...new SsrEnvConfig() }).toEqual({
            api: { baseUrl: "http://localhost:3002", token: "api-token" },
        });
    });

    it("names every missing key at once", () => {
        vi.stubEnv("INVESTLAB_API_URL", undefined);
        vi.stubEnv("INVESTLAB_API_TOKEN", "");

        expect(() => new SsrEnvConfig()).toThrow(
            "Missing env vars: INVESTLAB_API_URL, INVESTLAB_API_TOKEN",
        );
    });
});
