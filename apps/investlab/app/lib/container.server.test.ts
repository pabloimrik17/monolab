import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLATFORM } from "@m0n0lab/investlab-platform/client";
import {
    PORTFOLIO,
    PortfolioItemCreateUseCase,
    PortfolioItemDeleteUseCase,
    PortfolioItemListUseCase,
    PortfolioItemUpdateUseCase,
} from "@m0n0lab/investlab-portfolio/client";
import { QUOTES, QuoteListUseCase } from "@m0n0lab/investlab-quotes/client";
import { createContainer } from "./container.server";

describe("createContainer", () => {
    beforeEach(() => {
        vi.stubEnv("INVESTLAB_API_URL", "http://localhost:3002");
        vi.stubEnv("INVESTLAB_API_TOKEN", "api-token");
    });

    it("reads the API settings from the env", () => {
        expect(createContainer().get(PLATFORM.Config).api).toEqual({
            baseUrl: "http://localhost:3002",
            token: "api-token",
        });
    });

    it("resolves the client use cases wired to the API", () => {
        const container = createContainer();

        expect(container.get(PORTFOLIO.ItemList)).toBeInstanceOf(PortfolioItemListUseCase);
        expect(container.get(PORTFOLIO.ItemCreate)).toBeInstanceOf(PortfolioItemCreateUseCase);
        expect(container.get(PORTFOLIO.ItemUpdate)).toBeInstanceOf(PortfolioItemUpdateUseCase);
        expect(container.get(PORTFOLIO.ItemDelete)).toBeInstanceOf(PortfolioItemDeleteUseCase);
        expect(container.get(QUOTES.List)).toBeInstanceOf(QuoteListUseCase);
    });

    it("names every missing env var when a use case is first resolved", () => {
        vi.stubEnv("INVESTLAB_API_URL", "");

        expect(() => createContainer().get(QUOTES.List)).toThrow(
            "Missing env vars: INVESTLAB_API_URL",
        );
    });
});
