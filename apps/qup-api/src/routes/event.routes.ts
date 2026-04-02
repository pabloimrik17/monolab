import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { type EventBus, type GetSessionByCodeUseCase, Order, TOKENS } from "@m0n0lab/qup-domain";
import { toApiError } from "../errors/error-mapping.ts";
import { toOrderDto } from "../serializers/dto-serializers.ts";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Container } from "inversify";

export function eventRoutes(container: Container) {
    const app = new Hono();

    // GET /events/sessions/:code — SSE filtered by session
    app.get("/sessions/:code", async (c) => {
        const code = c.req.param("code");

        const getSession = container.get<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase);
        const sessionResult = await getSession.execute(code);

        if (sessionResult.isErr()) {
            const dto = toApiError(sessionResult.error);
            return c.json(dto, dto.statusCode as ContentfulStatusCode);
        }

        const session = sessionResult.value;
        const eventBus = container.get<EventBus>(TOKENS.EventBus);

        return streamSSE(c, async (stream) => {
            const disposers: (() => void)[] = [];

            const subscribe = (event: string) => {
                const dispose = eventBus.on(event, (payload: unknown) => {
                    const data = payload as Record<string, unknown>;
                    if (data["sessionId"] === session.id) {
                        // Serialize Order entity to DTO for order:created
                        const serialized =
                            event === "order:created" && data["order"] instanceof Order
                                ? { ...data, order: toOrderDto(data["order"] as Order) }
                                : data;
                        stream.writeSSE({ event, data: JSON.stringify(serialized) });
                    }
                });
                disposers.push(dispose);
            };

            subscribe("order:created");
            subscribe("order:status");
            subscribe("order:cancelled");
            subscribe("session:closed");

            stream.onAbort(() => {
                for (const dispose of disposers) {
                    dispose();
                }
            });

            // Keep stream alive
            while (true) {
                await stream.writeSSE({ event: "ping", data: "" });
                await stream.sleep(30_000);
            }
        });
    });

    return app;
}
