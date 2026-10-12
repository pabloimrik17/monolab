import { Container } from "inversify";
import { portfolioModule } from "@m0n0lab/investlab-application-server";
import { TOKENS } from "@m0n0lab/investlab-domain";
import { createApp } from "../app.ts";
import {
    InMemoryInstrumentRepository,
    InMemoryPortfolioItemQuery,
    InMemoryPortfolioItemRepository,
    InMemoryQuoteRepository,
} from "./in-memory-portfolio.ts";

const TEST_TOKEN = "s3cret-token";

export function createTestApp() {
    const instruments = new InMemoryInstrumentRepository();
    const items = new InMemoryPortfolioItemRepository();
    const quotes = new InMemoryQuoteRepository();

    const container = new Container();
    container.bind(TOKENS.InstrumentRepository).toConstantValue(instruments);
    container.bind(TOKENS.PortfolioItemRepository).toConstantValue(items);
    container
        .bind(TOKENS.PortfolioItemQuery)
        .toConstantValue(new InMemoryPortfolioItemQuery(items, instruments));
    container.bind(TOKENS.QuoteRepository).toConstantValue(quotes);
    container.load(portfolioModule);

    const app = createApp(container, { token: TEST_TOKEN });

    function request(path: string, init: RequestInit = {}) {
        return app.request(path, {
            ...init,
            headers: { Authorization: `Bearer ${TEST_TOKEN}`, ...init.headers },
        });
    }

    function json(path: string, method: string, body: unknown) {
        return request(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    }

    return { app, request, json, instruments, items, quotes };
}
