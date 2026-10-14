import { ContainerModule } from "inversify";
import Redis from "ioredis";
import { HttpClient } from "../shared/http-client.ts";
import { closeDb, createDb } from "./db.ts";
import { PLATFORM } from "./tokens.ts";

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
        .toDynamicValue(
            (context) => new Redis(context.get(PLATFORM.Config).redis.url, { lazyConnect: true }),
        )
        .inSingletonScope()
        .onDeactivation(async (redis) => {
            // `quit()` on a never-used lazy client would open a connection just to close it.
            if (redis.status === "wait") {
                redis.disconnect();
                return;
            }
            await redis.quit();
        });
});
