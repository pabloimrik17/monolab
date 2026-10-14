import { Container } from "inversify";
import {
    InstrumentCreateUseCase,
    InstrumentDeleteUseCase,
    InstrumentListUseCase,
    InstrumentUpdateUseCase,
    PORTFOLIO,
    PortfolioItemCreateUseCase,
    PortfolioItemDeleteUseCase,
    PortfolioItemListUseCase,
    PortfolioItemUpdateUseCase,
} from "@m0n0lab/investlab-portfolio/server";
import { QUOTES, QuoteListUseCase } from "@m0n0lab/investlab-quotes/server";
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
    const query = new InMemoryPortfolioItemQuery(items, instruments);

    // The real use cases over in-memory ports; the modules keep their repository tokens internal.
    const container = new Container();
    container
        .bind(PORTFOLIO.ItemCreate)
        .toConstantValue(new PortfolioItemCreateUseCase(instruments, items));
    container.bind(PORTFOLIO.ItemUpdate).toConstantValue(new PortfolioItemUpdateUseCase(items));
    container.bind(PORTFOLIO.ItemDelete).toConstantValue(new PortfolioItemDeleteUseCase(items));
    container
        .bind(PORTFOLIO.ItemList)
        .toConstantValue(new PortfolioItemListUseCase(query, instruments));
    container
        .bind(PORTFOLIO.InstrumentList)
        .toConstantValue(new InstrumentListUseCase(instruments));
    container
        .bind(PORTFOLIO.InstrumentCreate)
        .toConstantValue(new InstrumentCreateUseCase(instruments));
    container
        .bind(PORTFOLIO.InstrumentUpdate)
        .toConstantValue(new InstrumentUpdateUseCase(instruments));
    container
        .bind(PORTFOLIO.InstrumentDelete)
        .toConstantValue(new InstrumentDeleteUseCase(instruments, items));
    container.bind(QUOTES.List).toConstantValue(new QuoteListUseCase(quotes));

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
