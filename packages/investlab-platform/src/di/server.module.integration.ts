import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { sql } from "drizzle-orm";
import { Container } from "inversify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PLATFORM } from "#server/tokens.ts";
import { platformServerModule } from "./server.module.ts";
import type { ServerConfig } from "#server/config/server.config.ts";

/** TCP connections this process holds open. */
function openSockets(): number {
    return process.getActiveResourcesInfo().filter((resource) => resource === "TCPSocketWrap")
        .length;
}

describe("platformServerModule", () => {
    describe("against Postgres", () => {
        let postgres: StartedPostgreSqlContainer;

        beforeAll(async () => {
            postgres = await new PostgreSqlContainer("postgres:17-alpine").start();
        });

        afterAll(async () => {
            await postgres.stop();
        });

        // A database dropped or stopped under a connection still closing fails it with 57P01.
        it("closes every Postgres connection before unbinding resolves", async () => {
            const config: ServerConfig = {
                database: { url: postgres.getConnectionUri() },
                // Nothing listens here; the test never touches Redis.
                redis: { url: "redis://127.0.0.1:1" },
                finnhub: { apiKey: "finnhub-key" },
                api: { port: 3002, token: "api-token" },
            };
            const container = new Container();
            container.bind(PLATFORM.Config).toConstantValue(config);
            container.load(platformServerModule);
            const db = container.get(PLATFORM.Db);
            const before = openSockets();

            // Concurrent queries make the pool open one connection each.
            const results = await Promise.all(
                [1, 2, 3].map(() =>
                    db.select((pg) => pg.select({ slept: sql`1` }).from(sql`pg_sleep(0.05)`)),
                ),
            );
            expect(results.every((result) => result.isOk())).toBe(true);
            expect(openSockets()).toBe(before + 3);

            await container.unbindAllAsync();

            expect(openSockets()).toBe(before);
        });
    });
});
