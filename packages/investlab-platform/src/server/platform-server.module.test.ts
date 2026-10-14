import { Container } from "inversify";
import { describe, expect, it } from "vitest";
import { platformServerModule } from "./platform-server.module.ts";
import { PLATFORM } from "./tokens.ts";
import type { ServerConfig } from "./config.ts";

/** Nothing listens on port 1, so any connection attempt would fail the test. */
const CONFIG: ServerConfig = {
    database: { url: "postgres://investlab:investlab@127.0.0.1:1/investlab" },
    redis: { url: "redis://127.0.0.1:1" },
    finnhub: { apiKey: "finnhub-key" },
    api: { port: 3002, token: "api-token" },
};

function createContainer(): Container {
    const container = new Container();
    container.bind(PLATFORM.Config).toConstantValue(CONFIG);
    container.load(platformServerModule);
    return container;
}

describe("platformServerModule", () => {
    it("builds one Db and one Redis client from Config without connecting", () => {
        const container = createContainer();

        expect(container.get(PLATFORM.Db)).toBe(container.get(PLATFORM.Db));
        expect(container.get(PLATFORM.Redis)).toBe(container.get(PLATFORM.Redis));
        expect(container.get(PLATFORM.Redis).status).toBe("wait");
    });

    it("releases the clients when the container is unbound", async () => {
        const container = createContainer();
        const redis = container.get(PLATFORM.Redis);
        container.get(PLATFORM.Db);

        await container.unbindAllAsync();

        expect(redis.status).toBe("end");
    });
});
