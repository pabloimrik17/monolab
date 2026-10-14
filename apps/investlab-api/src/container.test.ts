import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    APP_TOKENS,
    InstrumentListUseCase,
    PortfolioItemListUseCase,
} from "@m0n0lab/investlab-application-server";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";
import { QUOTES, QuoteListUseCase } from "@m0n0lab/investlab-quotes/server";
import { createContainer } from "./container.ts";

const ENV = {
    DATABASE_URL: "postgres://investlab:investlab@localhost:5433/investlab",
    REDIS_URL: "redis://localhost:6379",
    FINNHUB_API_KEY: "finnhub-key",
    PORT: "3002",
    INVESTLAB_API_TOKEN: "api-token",
};

describe("createContainer", () => {
    beforeEach(() => {
        for (const [key, value] of Object.entries(ENV)) {
            vi.stubEnv(key, value);
        }
    });

    it("reads the API settings from the env", () => {
        expect(createContainer().get(PLATFORM.Config).api).toEqual({
            port: 3002,
            token: ENV.INVESTLAB_API_TOKEN,
        });
    });

    it("resolves the use cases wired to Postgres, Redis and Finnhub without connecting", () => {
        const container = createContainer();

        expect(container.get(APP_TOKENS.PortfolioItemListUseCase)).toBeInstanceOf(
            PortfolioItemListUseCase,
        );
        expect(container.get(APP_TOKENS.InstrumentListUseCase)).toBeInstanceOf(
            InstrumentListUseCase,
        );
        expect(container.get(QUOTES.List)).toBeInstanceOf(QuoteListUseCase);
        expect(container.get(PLATFORM.Redis).status).toBe("wait");
    });

    it("names every missing env var when a use case is first resolved", () => {
        vi.stubEnv("DATABASE_URL", "");
        vi.stubEnv("FINNHUB_API_KEY", undefined);

        expect(() => createContainer().get(QUOTES.List)).toThrow(
            "Missing env vars: DATABASE_URL, FINNHUB_API_KEY",
        );
    });
});
