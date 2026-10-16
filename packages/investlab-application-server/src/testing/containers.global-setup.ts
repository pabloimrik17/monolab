// fallow-ignore-file unused-file -- loaded by the integration project's `globalSetup` in vitest.config.ts, which the fallow vitest plugin does not follow
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer } from "@testcontainers/redis";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { TEMPLATE_DATABASE, withDatabase } from "./database-url.ts";
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

/** Starts Postgres and Redis once per run and migrates the template database files clone. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
    const [postgres, redis] = await Promise.all([
        new PostgreSqlContainer("postgres:17-alpine").start(),
        new RedisContainer("redis:7-alpine").start(),
    ]);

    const serverUrl = postgres.getConnectionUri();
    const admin = new pg.Client({ connectionString: serverUrl });
    await admin.connect();
    try {
        await admin.query(`CREATE DATABASE ${TEMPLATE_DATABASE}`);
    } finally {
        await admin.end();
    }

    const pool = new pg.Pool({ connectionString: withDatabase(serverUrl, TEMPLATE_DATABASE) });
    try {
        await migrate(drizzle(pool), { migrationsFolder });
    } finally {
        await pool.end();
    }

    project.provide("databaseUrl", serverUrl);
    project.provide("redisUrl", redis.getConnectionUrl());

    return async () => {
        await Promise.all([postgres.stop(), redis.stop()]);
    };
}
