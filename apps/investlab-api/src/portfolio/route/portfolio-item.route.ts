import { Hono } from "hono";
import {
    createPortfolioItemDtoSchema,
    updatePortfolioItemDtoSchema,
} from "@m0n0lab/investlab-portfolio";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/server";
import { replyEmpty, replyJson } from "../../core/mapper/result-http.mapper.ts";
import {
    validateId,
    validateJsonBody,
} from "../../core/middleware/request-validation.middleware.ts";
import { toPortfolioItemDto, toPortfolioItemListDto } from "../../serializers/dto-serializers.ts";
import type { Container } from "inversify";

export function portfolioItemRoutes(container: Container) {
    const app = new Hono();

    app.get("/", async (c) => {
        const uc = container.get(PORTFOLIO.ItemList);

        return replyJson(c, await uc.execute(), toPortfolioItemListDto);
    });

    app.post("/", validateJsonBody(createPortfolioItemDtoSchema), async (c) => {
        const body = c.get("body");
        const uc = container.get(PORTFOLIO.ItemCreate);

        const result = await uc.execute({
            instrumentId: body.instrumentId,
            broker: body.broker,
            targetWeight: body.targetWeight,
            ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
            ...(body.notes !== undefined && { notes: body.notes ?? undefined }),
        });

        return replyJson(c, result, toPortfolioItemDto, 201);
    });

    app.put("/:id", validateId, validateJsonBody(updatePortfolioItemDtoSchema), async (c) => {
        const id = c.get("id");
        const body = c.get("body");
        const uc = container.get(PORTFOLIO.ItemUpdate);

        const result = await uc.execute(
            id,
            {
                ...(body.broker !== undefined && { broker: body.broker }),
                ...(body.targetWeight !== undefined && { targetWeight: body.targetWeight }),
                ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
                ...(body.notes !== undefined && { notes: body.notes ?? undefined }),
            },
            new Date(body.expectedUpdatedAt),
        );

        return replyJson(c, result, toPortfolioItemDto);
    });

    app.delete("/:id", validateId, async (c) => {
        const id = c.get("id");
        const uc = container.get(PORTFOLIO.ItemDelete);

        return replyEmpty(c, await uc.execute(id));
    });

    return app;
}
