import { Hono } from "hono";
import { handleError } from "./errors/error-mapping.ts";
import { bearerAuth } from "./middleware/bearer-auth.ts";
import { healthRoutes } from "./routes/health.routes.ts";
import type { Container } from "inversify";

interface AppOptions {
    readonly token: string | undefined;
}

export function createApp(_container: Container, { token }: AppOptions) {
    const app = new Hono();

    app.route("/health", healthRoutes());

    app.use("*", bearerAuth(token));

    app.onError(handleError);

    return app;
}
