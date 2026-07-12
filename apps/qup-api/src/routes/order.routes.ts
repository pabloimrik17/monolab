import { Hono } from "hono";
import {
    type CancelOrderUseCase,
    type CreateOrderUseCase,
    type GetSessionByCodeUseCase,
    type GetSessionOrdersUseCase,
    TOKENS,
    type UpdateOrderStatusUseCase,
} from "@m0n0lab/qup-domain";
import { errorJson } from "../errors/error-mapping.ts";
import { adminOnly } from "../middleware/admin-only.ts";
import { toOrderDto } from "../serializers/dto-serializers.ts";
import type { CreateOrderRequest, UpdateOrderStatusRequest } from "@m0n0lab/qup-shared";
import type { Container } from "inversify";

export function orderRoutes(container: Container) {
    const app = new Hono();

    // POST /orders
    app.post("/", async (c) => {
        const body = await c.req.json<CreateOrderRequest>();

        // Resolve session by code first
        const getSession = container.get<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase);
        const sessionResult = await getSession.execute(body.sessionCode);

        if (sessionResult.isErr()) {
            return errorJson(c, sessionResult.error);
        }

        const uc = container.get<CreateOrderUseCase>(TOKENS.CreateOrderUseCase);
        const result = await uc.execute({
            sessionId: sessionResult.value.id,
            guestName: body.guestName,
            items: body.items,
            ...(body.notes != null && { notes: body.notes }),
        });

        return result.match(
            (order) => c.json(toOrderDto(order), 201),
            (error) => errorJson(c, error),
        );
    });

    // GET /orders?sessionId&guest
    app.get("/", async (c) => {
        const sessionId = c.req.query("sessionId");
        if (!sessionId) {
            return c.json(
                {
                    code: "VALIDATION_ERROR",
                    message: "sessionId query param required",
                    statusCode: 422,
                },
                422,
            );
        }

        const uc = container.get<GetSessionOrdersUseCase>(TOKENS.GetSessionOrdersUseCase);
        const result = await uc.execute(sessionId);

        return result.match(
            (orders) => {
                const guest = c.req.query("guest");
                const filtered = guest ? orders.filter((o) => o.guestName === guest) : orders;
                return c.json(filtered.map(toOrderDto));
            },
            (error) => errorJson(c, error),
        );
    });

    // PATCH /orders/:id/status (admin)
    app.patch("/:id/status", adminOnly(), async (c) => {
        const id = c.req.param("id")!;
        const body = await c.req.json<UpdateOrderStatusRequest>();
        const uc = container.get<UpdateOrderStatusUseCase>(TOKENS.UpdateOrderStatusUseCase);

        const action =
            body.status === "PREPARING" ? "preparing" : body.status === "DONE" ? "done" : null;
        if (action === null) {
            return c.json(
                { code: "VALIDATION_ERROR", message: "Invalid status value", statusCode: 422 },
                422,
            );
        }
        // fallow-ignore-next-line code-duplication -- uniform use-case handler shell after errorJson extraction, handler factory not warranted
        const result = await uc.execute(id, action);

        return result.match(
            () => c.json({ ok: true }),
            (error) => errorJson(c, error),
        );
    });

    // DELETE /orders/:id (admin)
    app.delete("/:id", adminOnly(), async (c) => {
        const id = c.req.param("id")!;
        const uc = container.get<CancelOrderUseCase>(TOKENS.CancelOrderUseCase);

        const result = await uc.execute(id);

        return result.match(
            () => c.json({ ok: true }),
            (error) => errorJson(c, error),
        );
    });

    return app;
}
