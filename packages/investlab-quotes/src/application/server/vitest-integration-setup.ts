import { Container } from "inversify";
import Redis from "ioredis";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, inject } from "vitest";
import {
    PLATFORM,
    platformServerModule,
    type ServerConfig,
} from "@m0n0lab/investlab-platform/server";
import { quotesServerModule } from "../../module.server.ts";

/** Finnhub for this file; `given.ts` declares its answers, anything undeclared fails the test. */
export const finnhub = setupServer();

/** The API's composition of the quotes module, on this file's own Redis logical database, flushed per test. */
export let container: Container;

/** The same composition with a Redis that cannot be reached, as when its server is down. */
export let containerWithCacheDown: Container;

let redisUrl: string;

/** The Finnhub key the composition is configured with; `given.ts` answers only requests carrying it. */
export const FINNHUB_API_KEY = "test-finnhub-key";

/** Nothing listens on port 1: connections are refused. */
const UNREACHABLE_REDIS_URL = "redis://127.0.0.1:1";

function testConfig(redisUrl: string): ServerConfig {
    return {
        // Quotes never touch the database; nothing listens here.
        database: { url: "postgres://investlab:investlab@127.0.0.1:1/investlab" },
        redis: { url: redisUrl },
        finnhub: { apiKey: FINNHUB_API_KEY },
        api: { port: 3002, token: "test-api-token" },
    };
}

/** This file's own Redis logical database: 0 counts the files, which take 1..15 in turn. */
async function fileRedisUrl(): Promise<string> {
    const counter = new Redis(inject("redisUrl"));
    const fileNumber = await counter.incr("files").finally(() => counter.disconnect());
    const url = new URL(inject("redisUrl"));
    url.pathname = `/${1 + ((fileNumber - 1) % 15)}`;
    return url.toString();
}

function composition(url: string): Container {
    const composed = new Container();
    composed.load(platformServerModule, quotesServerModule);
    composed.bind(PLATFORM.Config).toConstantValue(testConfig(url));
    return composed;
}

beforeAll(async () => {
    redisUrl = await fileRedisUrl();
    finnhub.listen({ onUnhandledRequest: "error" });
});

// Every test starts with an empty quote cache.
beforeEach(async () => {
    container = composition(redisUrl);
    containerWithCacheDown = composition(UNREACHABLE_REDIS_URL);
    await container.get(PLATFORM.Redis).flushdb();
});

afterEach(async () => {
    finnhub.resetHandlers();
    // Async deactivation (Redis `quit`) needs the async unbind.
    await Promise.all([container.unbindAllAsync(), containerWithCacheDown.unbindAllAsync()]);
});

afterAll(() => {
    finnhub.close();
});
