import { Hono } from "hono";
import { instrumentRoutes } from "#catalog/route/instrument.route.ts";
import { handleError } from "#core/mapper/error-http.mapper.ts";
import { bearerAuth } from "#core/middleware/bearer-auth.middleware.ts";
import { healthRoutes } from "#core/route/health.route.ts";
import { portfolioItemRoutes } from "#portfolio/route/portfolio-item.route.ts";
import { quoteRoutes } from "#quotes/route/quote.route.ts";
import { entryRoutes } from "#roger/route/entry.route.ts";
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
    app.route("/quotes", quoteRoutes(container));
    app.route("/roger/entries", entryRoutes(container));

    app.onError(handleError);

    return app;
}
