import { Hono } from "hono";
import { handleError } from "./errors/error-mapping.ts";
import { bearerAuth } from "./middleware/bearer-auth.ts";
import { healthRoutes } from "./routes/health.routes.ts";
import { instrumentRoutes } from "./routes/instruments.routes.ts";
import { portfolioItemRoutes } from "./routes/portfolio-items.routes.ts";
import type { Container } from "inversify";

interface AppOptions {
    readonly token: string | undefined;
}

export function createApp(container: Container, { token }: AppOptions) {
    const app = new Hono();

    app.route("/health", healthRoutes());

    app.use("*", bearerAuth(token));

    app.route("/portfolio-items", portfolioItemRoutes(container));
    app.route("/instruments", instrumentRoutes(container));

    app.onError(handleError);

    return app;
}
