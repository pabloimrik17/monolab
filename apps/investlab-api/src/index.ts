import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createContainer } from "./container.ts";

const parsedPort = Number(process.env["PORT"] ?? 3002);
if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    console.error(`Invalid PORT: ${process.env["PORT"]}`);
    process.exit(1);
}
const port = parsedPort;

const app = createApp(createContainer());

console.log(`investlab-api listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
