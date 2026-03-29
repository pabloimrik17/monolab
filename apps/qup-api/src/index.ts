import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createContainer } from "./container.ts";

const port = Number(process.env["PORT"] ?? 3001);

if (!process.env["API_ADMIN_PIN"]) {
    console.error("API_ADMIN_PIN env var is required");
    process.exit(1);
}

const container = createContainer();
const app = createApp(container);

console.log(`qup-api listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
