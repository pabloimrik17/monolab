import { Hono } from "hono";
import { handleError } from "./errors/error-mapping.ts";
import { healthRoutes } from "./routes/health.routes.ts";
import type { Container } from "inversify";

export function createApp(_container: Container) {
    const app = new Hono();

    app.route("/health", healthRoutes());

    app.onError(handleError);

    return app;
}
