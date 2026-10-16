import { ContainerModule } from "inversify";
import Redis from "ioredis";
import { HttpClient } from "../shared/http-client.ts";
import { closeDb, createDb } from "./db.ts";
import { PLATFORM } from "./tokens.ts";

/**
 * While Redis is unreachable, commands fail at once instead of waiting through the reconnect
 * retries, so callers can fall back; the client keeps reconnecting in the background.
 * One warning per outage replaces ioredis' "Unhandled error event" on every retry.
 */
function createRedis(url: string): Redis {
    const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 0 });
    let down = false;
    redis.on("error", (error: Error) => {
        if (!down) {
            down = true;
            console.warn(`[Redis] unreachable, retrying in the background: ${error.message}`);
        }
    });
    redis.on("ready", () => {
        down = false;
    });
    return redis;
}

/**
 * Infrastructure built from `PLATFORM.Config`, which the composition root binds.
 * Nothing connects until first use; unbinding releases the pool and the Redis connection.
 */
export const platformServerModule = new ContainerModule(({ bind }) => {
    bind(PLATFORM.HttpClient).to(HttpClient).inSingletonScope();
    bind(PLATFORM.Db)
        .toDynamicValue((context) => createDb(context.get(PLATFORM.Config).database.url))
        .inSingletonScope()
        .onDeactivation(closeDb);
    bind(PLATFORM.Redis)
        .toDynamicValue((context) => createRedis(context.get(PLATFORM.Config).redis.url))
        .inSingletonScope()
        .onDeactivation(async (redis) => {
            // `quit()` on a never-used lazy client would open a connection just to close it.
            if (redis.status === "wait") {
                redis.disconnect();
                return;
            }
            // A Redis that refuses commands cannot be quit politely; drop the connection instead.
            await redis.quit().catch(() => redis.disconnect());
        });
});
