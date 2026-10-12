import { describe, expect, it } from "vitest";
import {
    APP_TOKENS,
    InstrumentListUseCase,
    PortfolioItemListUseCase,
    QuoteListUseCase,
} from "@m0n0lab/investlab-application-server";
import { createContainer, readApiEnv } from "./container.ts";

const ENV = {
    DATABASE_URL: "postgres://investlab:investlab@localhost:5433/investlab",
    REDIS_URL: "redis://localhost:6379",
    FINNHUB_API_KEY: "finnhub-key",
};

describe("readApiEnv", () => {
    it("reads the backing-service settings", () => {
        expect(readApiEnv(ENV)).toEqual({
            databaseUrl: ENV.DATABASE_URL,
            redisUrl: ENV.REDIS_URL,
            finnhubApiKey: ENV.FINNHUB_API_KEY,
        });
    });

    it("names every missing variable at once", () => {
        expect(() => readApiEnv({ REDIS_URL: ENV.REDIS_URL, FINNHUB_API_KEY: "" })).toThrow(
            "Missing env vars: DATABASE_URL, FINNHUB_API_KEY",
        );
    });
});

describe("createContainer", () => {
    it("resolves the use cases wired to Postgres, Redis and Finnhub without connecting", () => {
        const container = createContainer(readApiEnv(ENV));

        expect(container.get(APP_TOKENS.PortfolioItemListUseCase)).toBeInstanceOf(
            PortfolioItemListUseCase,
        );
        expect(container.get(APP_TOKENS.InstrumentListUseCase)).toBeInstanceOf(
            InstrumentListUseCase,
        );
        expect(container.get(APP_TOKENS.QuoteListUseCase)).toBeInstanceOf(QuoteListUseCase);
    });
});
