import { Container } from "inversify";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { PLATFORM, platformClientModule } from "@m0n0lab/investlab-platform/client";
import { quotesClientModule } from "../../module.client.ts";

export const API_URL = "http://investlab-api.test";

/** The InvestLab API for this file; `given.ts` declares its answers, anything undeclared fails the test. */
export const investlabApi = setupServer();

/** The web's composition of the quotes module, pointed at the fake API. */
export const container = new Container();
container
    .bind(PLATFORM.Config)
    .toConstantValue({ api: { baseUrl: API_URL, token: "test-api-token" } });
container.load(platformClientModule, quotesClientModule);

beforeAll(() => {
    investlabApi.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
    investlabApi.resetHandlers();
});

afterAll(async () => {
    await container.unbindAllAsync();
    investlabApi.close();
});
