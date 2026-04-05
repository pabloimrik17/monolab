import { Hono } from "hono";
import {
    type CreateMenuItemUseCase,
    type DeleteMenuItemUseCase,
    type GetMenuUseCase,
    TOKENS,
    type UpdateMenuItemUseCase,
} from "@m0n0lab/qup-domain";
import { toApiError } from "../errors/error-mapping.ts";
import { adminOnly } from "../middleware/admin-only.ts";
import { toMenuItemDto } from "../serializers/dto-serializers.ts";
import type { Category } from "@m0n0lab/qup-domain";
import type { CreateMenuItemRequest, UpdateMenuItemRequest } from "@m0n0lab/qup-shared";
import type { Container } from "inversify";

export function menuRoutes(container: Container) {
    const app = new Hono();

    // GET /menu
    app.get("/", async (c) => {
        const available = c.req.query("available");
        const uc = container.get<GetMenuUseCase>(TOKENS.GetMenuUseCase);
        const result = await uc.execute(available === "true" ? { availableOnly: true } : undefined);

        return result.match(
            (items) => c.json(items.map(toMenuItemDto)),
            (error) => {
                const dto = toApiError(error);
                return c.json(dto, dto.statusCode as 500);
            },
        );
    });

    // POST /menu (admin)
    app.post("/", adminOnly(), async (c) => {
        const body = await c.req.json<CreateMenuItemRequest>();
        const uc = container.get<CreateMenuItemUseCase>(TOKENS.CreateMenuItemUseCase);

        const result = await uc.execute({
            name: body.name,
            category: body.category as Category,
            ...(body.description != null && { description: body.description }),
            ...(body.sortOrder != null && { sortOrder: body.sortOrder }),
        });

        return result.match(
            (item) => c.json(toMenuItemDto(item), 201),
            (error) => {
                const dto = toApiError(error);
                return c.json(dto, dto.statusCode as 422);
            },
        );
    });

    // PATCH /menu/:id (admin)
    app.patch("/:id", adminOnly(), async (c) => {
        const id = c.req.param("id")!;
        const body = await c.req.json<UpdateMenuItemRequest>();
        const uc = container.get<UpdateMenuItemUseCase>(TOKENS.UpdateMenuItemUseCase);

        const updates: Parameters<typeof uc.execute>[1] = {};
        if (body.name != null) updates.name = body.name;
        if (body.category != null) updates.category = body.category as Category;
        if (body.description != null) updates.description = body.description;
        if (body.available != null) updates.available = body.available;
        if (body.sortOrder != null) updates.sortOrder = body.sortOrder;

        const result = await uc.execute(id, updates);

        return result.match(
            () => c.json({ ok: true }),
            (error) => {
                const dto = toApiError(error);
                return c.json(dto, dto.statusCode as 404);
            },
        );
    });

    // DELETE /menu/:id (admin)
    app.delete("/:id", adminOnly(), async (c) => {
        const id = c.req.param("id")!;
        const uc = container.get<DeleteMenuItemUseCase>(TOKENS.DeleteMenuItemUseCase);

        const result = await uc.execute(id);

        return result.match(
            () => c.body(null, 204),
            (error) => {
                const dto = toApiError(error);
                return c.json(dto, dto.statusCode as 404);
            },
        );
    });

    return app;
}
