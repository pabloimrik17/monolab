// fallow-ignore-file unused-file -- loaded by the integration project's `setupFiles` in vitest.config.ts, which the fallow vitest plugin does not follow
import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import pg from "pg";
import { afterAll, beforeAll, inject } from "vitest";
import { TEMPLATE_DATABASE, withDatabase } from "./database-url.ts";

/** Redis serves 16 logical databases; 0 holds the counter, files take 1..15 in turn. */
const REDIS_FILE_DATABASES = 15;
const REDIS_FILE_COUNTER = "investlab:integration-files";

/** Postgres refuses to clone a template another clone is reading, so clones take turns. */
const CLONE_LOCK = 4_242;

const database = `investlab_${randomUUID().replaceAll("-", "")}`;

/** Connection URLs of this file's own database and Redis logical database. */
export const fileUrls = { databaseUrl: "", redisUrl: "" };

async function withServer(run: (client: pg.Client) => Promise<void>): Promise<void> {
    const client = new pg.Client({ connectionString: inject("databaseUrl") });
    await client.connect();
    try {
        await run(client);
    } finally {
        await client.end();
    }
}

async function claimRedisDatabase(): Promise<string> {
    const redis = new Redis(inject("redisUrl"));
    try {
        const claimed = await redis.incr(REDIS_FILE_COUNTER);
        const url = new URL(inject("redisUrl"));
        url.pathname = `/${1 + ((claimed - 1) % REDIS_FILE_DATABASES)}`;
        return url.toString();
    } finally {
        redis.disconnect();
    }
}

beforeAll(async () => {
    await withServer(async (client) => {
        await client.query("SELECT pg_advisory_lock($1)", [CLONE_LOCK]);
        try {
            await client.query(`CREATE DATABASE ${database} TEMPLATE ${TEMPLATE_DATABASE}`);
        } finally {
            await client.query("SELECT pg_advisory_unlock($1)", [CLONE_LOCK]);
        }
    });
    fileUrls.databaseUrl = withDatabase(inject("databaseUrl"), database);
    fileUrls.redisUrl = await claimRedisDatabase();
});

afterAll(async () => {
    await withServer(async (client) => {
        await client.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
    });
});
