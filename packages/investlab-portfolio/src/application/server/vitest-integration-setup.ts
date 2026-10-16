import { randomUUID } from "node:crypto";
import { Container } from "inversify";
import pg from "pg";
import { afterEach, beforeEach, inject } from "vitest";
import {
    PLATFORM,
    platformServerModule,
    type ServerConfig,
} from "@m0n0lab/investlab-platform/server";
import { portfolioServerModule } from "../../module.server.ts";

/** Postgres refuses to clone a template another clone is reading, so clones take turns. */
const CLONE_LOCK = 4_242;

/** Postgres URL nothing listens on. */
const UNREACHABLE_DATABASE_URL = "postgres://investlab:investlab@127.0.0.1:1/investlab";

/** The API's composition of the portfolio module, on this test's own clone of the migrated template. */
export let container: Container;

/** The same composition with a database that cannot be reached. */
export let containerWithDatabaseDown: Container;

let database: string;

function testConfig(databaseUrl: string): ServerConfig {
    return {
        database: { url: databaseUrl },
        // The portfolio never touches Redis or Finnhub; nothing listens here.
        redis: { url: "redis://127.0.0.1:1" },
        finnhub: { apiKey: "test-finnhub-key" },
        api: { port: 3002, token: "test-api-token" },
    };
}

async function onServer(run: (client: pg.Client) => Promise<unknown>): Promise<void> {
    const client = new pg.Client({ connectionString: inject("databaseUrl") });
    await client.connect();
    try {
        await run(client);
    } finally {
        await client.end();
    }
}

function composition(databaseUrl: string): Container {
    const composed = new Container();
    composed.load(platformServerModule, portfolioServerModule);
    composed.bind(PLATFORM.Config).toConstantValue(testConfig(databaseUrl));
    return composed;
}

beforeEach(async () => {
    database = `investlab_${randomUUID().replaceAll("-", "")}`;
    await onServer(async (client) => {
        await client.query("SELECT pg_advisory_lock($1)", [CLONE_LOCK]);
        try {
            await client.query(
                `CREATE DATABASE ${database} TEMPLATE ${inject("templateDatabase")}`,
            );
        } finally {
            await client.query("SELECT pg_advisory_unlock($1)", [CLONE_LOCK]);
        }
    });
    const databaseUrl = new URL(inject("databaseUrl"));
    databaseUrl.pathname = `/${database}`;
    container = composition(databaseUrl.toString());
    containerWithDatabaseDown = composition(UNREACHABLE_DATABASE_URL);
});

afterEach(async () => {
    // Async deactivation (pool `end`) needs the async unbind.
    await Promise.all([container.unbindAllAsync(), containerWithDatabaseDown.unbindAllAsync()]);
    await onServer((client) => client.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`));
});
