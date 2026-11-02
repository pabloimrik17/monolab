import { Container } from "inversify";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { TICKERS_STORAGE_KEY } from "#data/client/repository/ticker-storage.repository.ts";
import { quotesBrowserModule } from "#di/browser.module.ts";
import { quotesClientModule } from "#di/client.module.ts";
import { MemoryStorage, PLATFORM_SHARED } from "@m0n0lab/investlab-platform";
import { PLATFORM, platformClientModule } from "@m0n0lab/investlab-platform/client";

export const API_URL = "http://investlab-api.test";

/** The InvestLab API for this file; `given.ts` declares its answers, anything undeclared fails the test. */
export const investlabApi = setupServer();

/** The web's composition of the quotes module, pointed at the fake API. */
export const container = new Container();
container
    .bind(PLATFORM.Config)
    .toConstantValue({ api: { baseUrl: API_URL, token: "test-api-token" } });

/** The browser's storage for this file, emptied after each test. */
export const storage = new MemoryStorage();
container.bind(PLATFORM_SHARED.KeyValueStorage).toConstantValue(storage);
container.load(platformClientModule, quotesClientModule, quotesBrowserModule);

beforeAll(() => {
    investlabApi.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
    storage.remove(TICKERS_STORAGE_KEY);
    investlabApi.resetHandlers();
});

afterAll(async () => {
    await container.unbindAllAsync();
    investlabApi.close();
});
