// fallow-ignore-file unused-file -- loaded by the integration project's `globalSetup` in vitest.config.ts, which the fallow vitest plugin does not follow
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer } from "@testcontainers/redis";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
    export interface ProvidedContext {
        databaseUrl: string;
        redisUrl: string;
    }
}

const migrationsFolder = join(
    dirname(createRequire(import.meta.url).resolve("@m0n0lab/investlab-data-server/package.json")),
    "drizzle",
);

/** Starts Postgres and Redis once per run and applies the data-server migrations. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
    const [postgres, redis] = await Promise.all([
        new PostgreSqlContainer("postgres:17-alpine").start(),
        new RedisContainer("redis:7-alpine").start(),
    ]);

    const pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });
    try {
        await migrate(drizzle(pool), { migrationsFolder });
    } finally {
        await pool.end();
    }

    project.provide("databaseUrl", postgres.getConnectionUri());
    project.provide("redisUrl", redis.getConnectionUrl());

    return async () => {
        await Promise.all([postgres.stop(), redis.stop()]);
    };
}
