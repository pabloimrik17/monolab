import { RedisContainer } from "@testcontainers/redis";
import type { TestProject } from "vitest/node";

declare module "vitest" {
    export interface ProvidedContext {
        redisUrl: string;
    }
}

/** Starts Redis once per run. Quotes own no table, so no Postgres is started. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
    const redis = await new RedisContainer("redis:7-alpine").start();
    project.provide("redisUrl", redis.getConnectionUrl());

    return async () => {
        await redis.stop();
    };
}
