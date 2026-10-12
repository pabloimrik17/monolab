import { describe, expect, it } from "vitest";
import {
    APP_TOKENS,
    PortfolioItemCreateUseCase,
    PortfolioItemDeleteUseCase,
    PortfolioItemListUseCase,
    PortfolioItemUpdateUseCase,
    QuoteListUseCase,
} from "@m0n0lab/investlab-application-client";
import { createContainer, readWebEnv } from "./container.server";

const ENV = {
    INVESTLAB_API_URL: "http://localhost:3002",
    INVESTLAB_API_TOKEN: "api-token",
};

describe("readWebEnv", () => {
    it("reads the API settings", () => {
        expect(readWebEnv(ENV)).toEqual({
            apiUrl: ENV.INVESTLAB_API_URL,
            apiToken: ENV.INVESTLAB_API_TOKEN,
        });
    });

    it("names every missing variable at once", () => {
        expect(() => readWebEnv({ INVESTLAB_API_TOKEN: "" })).toThrow(
            "Missing env vars: INVESTLAB_API_URL, INVESTLAB_API_TOKEN",
        );
    });
});

describe("createContainer", () => {
    it("resolves the client use cases wired to the API", () => {
        const container = createContainer(readWebEnv(ENV));

        expect(container.get(APP_TOKENS.PortfolioItemListUseCase)).toBeInstanceOf(
            PortfolioItemListUseCase,
        );
        expect(container.get(APP_TOKENS.PortfolioItemCreateUseCase)).toBeInstanceOf(
            PortfolioItemCreateUseCase,
        );
        expect(container.get(APP_TOKENS.PortfolioItemUpdateUseCase)).toBeInstanceOf(
            PortfolioItemUpdateUseCase,
        );
        expect(container.get(APP_TOKENS.PortfolioItemDeleteUseCase)).toBeInstanceOf(
            PortfolioItemDeleteUseCase,
        );
        expect(container.get(APP_TOKENS.QuoteListUseCase)).toBeInstanceOf(QuoteListUseCase);
    });
});
