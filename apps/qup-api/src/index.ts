import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createContainer } from "./container.ts";

const parsedPort = Number(process.env["PORT"] ?? 3001);
if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    console.error(`Invalid PORT: ${process.env["PORT"]}`);
    process.exit(1);
}
const port = parsedPort;

if (!process.env["API_ADMIN_PIN"]) {
    console.error("API_ADMIN_PIN env var is required");
    process.exit(1);
}

const container = createContainer();
const app = createApp(container);

console.log(`qup-api listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
