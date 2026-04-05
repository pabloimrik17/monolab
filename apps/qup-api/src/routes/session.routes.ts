import { Hono } from "hono";
import {
    type CloseSessionUseCase,
    type CreateSessionUseCase,
    type GetActiveSessionsUseCase,
    type GetSessionByCodeUseCase,
    type GetSessionByIdUseCase,
    type GetSessionOrdersUseCase,
    TOKENS,
} from "@m0n0lab/qup-domain";
import { toApiError } from "../errors/error-mapping.ts";
import { adminOnly } from "../middleware/admin-only.ts";
import { toOrderDto, toSessionDto } from "../serializers/dto-serializers.ts";
import type { CreateSessionRequest } from "@m0n0lab/qup-shared";
import type { Container } from "inversify";

export function sessionRoutes(container: Container) {
    const app = new Hono();

    // POST /sessions (admin)
    app.post("/", adminOnly(), async (c) => {
        const body = await c.req.json<CreateSessionRequest>();
        const uc = container.get<CreateSessionUseCase>(TOKENS.CreateSessionUseCase);

        const result = await uc.execute({ name: body.name });

        return result.match(
            (session) => c.json(toSessionDto(session), 201),
            (error) => {
                const dto = toApiError(error);
                return c.json(dto, dto.statusCode as 422);
            },
        );
    });

    // GET /sessions?status=OPEN
    app.get("/", async (c) => {
        const status = c.req.query("status");
        if (status === "OPEN") {
            const uc = container.get<GetActiveSessionsUseCase>(TOKENS.GetActiveSessionsUseCase);
            const result = await uc.execute();
            return result.match(
                (sessions) => c.json(sessions.map(toSessionDto)),
                (error) => {
                    const dto = toApiError(error);
                    return c.json(dto, dto.statusCode as 500);
                },
            );
        }
        return c.json(
            { code: "VALIDATION_ERROR", message: "status query param required", statusCode: 422 },
            422,
        );
    });

    // GET /sessions/code/:code
    app.get("/code/:code", async (c) => {
        const code = c.req.param("code");
        const uc = container.get<GetSessionByCodeUseCase>(TOKENS.GetSessionByCodeUseCase);

        const result = await uc.execute(code);

        return result.match(
            (session) => c.json(toSessionDto(session)),
            (error) => {
                const dto = toApiError(error);
                return c.json(dto, dto.statusCode as 404);
            },
        );
    });

    // GET /sessions/:id/orders
    app.get("/:id/orders", async (c) => {
        const sessionId = c.req.param("id");
        const uc = container.get<GetSessionOrdersUseCase>(TOKENS.GetSessionOrdersUseCase);
        const result = await uc.execute(sessionId);

        return result.match(
            (orders) => c.json(orders.map(toOrderDto)),
            (error) => {
                const dto = toApiError(error);
                return c.json(dto, dto.statusCode as 500);
            },
        );
    });

    // GET /sessions/:id
    app.get("/:id", async (c) => {
        const id = c.req.param("id");
        const uc = container.get<GetSessionByIdUseCase>(TOKENS.GetSessionByIdUseCase);

        const result = await uc.execute(id);

        return result.match(
            (session) => c.json(toSessionDto(session)),
            (error) => {
                const dto = toApiError(error);
                return c.json(dto, dto.statusCode as 404);
            },
        );
    });

    // PATCH /sessions/:id/close (admin)
    app.patch("/:id/close", adminOnly(), async (c) => {
        const id = c.req.param("id")!;
        const uc = container.get<CloseSessionUseCase>(TOKENS.CloseSessionUseCase);

        const result = await uc.execute(id);

        return result.match(
            () => c.json({ ok: true }),
            (error) => {
                const dto = toApiError(error);
                return c.json(dto, dto.statusCode as 404);
            },
        );
    });

    return app;
}
