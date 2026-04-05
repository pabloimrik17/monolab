import { Hono } from "hono";
import { cors } from "hono/cors";
import { DomainError } from "@m0n0lab/qup-domain";
import { toApiError } from "./errors/error-mapping.ts";
import { eventRoutes } from "./routes/event.routes.ts";
import { menuRoutes } from "./routes/menu.routes.ts";
import { orderRoutes } from "./routes/order.routes.ts";
import { sessionRoutes } from "./routes/session.routes.ts";
import type { Container } from "inversify";

export function createApp(container: Container) {
    const app = new Hono();

    app.use("*", cors());

    app.route("/sessions", sessionRoutes(container));
    app.route("/orders", orderRoutes(container));
    app.route("/menu", menuRoutes(container));
    app.route("/events", eventRoutes(container));

    app.onError((error, c) => {
        if (error instanceof DomainError) {
            const dto = toApiError(error);
            return c.json(dto, dto.statusCode as 500);
        }

        console.error("Unhandled error:", error);
        return c.json(
            { code: "INTERNAL_ERROR", message: "Internal server error", statusCode: 500 },
            500,
        );
    });

    return app;
}
