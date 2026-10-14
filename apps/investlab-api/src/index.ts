import "varlock/auto-load";
import { serve } from "@hono/node-server";
import { PLATFORM } from "@m0n0lab/investlab-platform/server";
import { createApp } from "./app.ts";
import { createContainer } from "./container.ts";

const container = createContainer();
const { api } = container.get(PLATFORM.Config);

const server = serve({ fetch: createApp(container, { token: api.token }).fetch, port: api.port });
console.log(`investlab-api listening on http://localhost:${api.port}`);

// Unbinding releases the Postgres pool and the Redis connection.
async function shutdown(): Promise<void> {
    server.close();
    await container.unbindAllAsync();
    process.exit(0);
}

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
