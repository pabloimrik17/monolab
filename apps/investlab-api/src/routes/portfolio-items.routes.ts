import { Hono } from "hono";
import { z } from "zod";
import {
    APP_TOKENS,
    type PortfolioItemCreateUseCase,
    type PortfolioItemDeleteUseCase,
    type PortfolioItemListUseCase,
    type PortfolioItemUpdateUseCase,
} from "@m0n0lab/investlab-application-server";
import {
    createPortfolioItemDtoSchema,
    updatePortfolioItemDtoSchema,
} from "@m0n0lab/investlab-data-contracts";
import { errorJson } from "../errors/error-mapping.ts";
import { parseJsonBody, parseWith } from "../errors/parse-request.ts";
import { toPortfolioItemDto, toPortfolioItemListDto } from "../serializers/dto-serializers.ts";
import type { Container } from "inversify";

const idSchema = z.string().uuid();

function parseId(c: { req: { param(name: "id"): string } }): string {
    return parseWith(idSchema, c.req.param("id"), "id");
}

export function portfolioItemRoutes(container: Container) {
    const app = new Hono();

    // GET /portfolio-items
    app.get("/", async (c) => {
        const uc = container.get<PortfolioItemListUseCase>(APP_TOKENS.PortfolioItemListUseCase);

        return (await uc.execute()).match(
            (list) => c.json(toPortfolioItemListDto(list)),
            (error) => errorJson(c, error),
        );
    });

    // POST /portfolio-items
    app.post("/", async (c) => {
        const body = await parseJsonBody(c, createPortfolioItemDtoSchema);
        const uc = container.get<PortfolioItemCreateUseCase>(APP_TOKENS.PortfolioItemCreateUseCase);

        const result = await uc.execute({
            instrumentId: body.instrumentId,
            broker: body.broker,
            targetWeight: body.targetWeight,
            ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
            ...(body.notes !== undefined && { notes: body.notes ?? undefined }),
        });

        return result.match(
            (item) => c.json(toPortfolioItemDto(item), 201),
            (error) => errorJson(c, error),
        );
    });

    // PUT /portfolio-items/:id
    app.put("/:id", async (c) => {
        const id = parseId(c);
        const body = await parseJsonBody(c, updatePortfolioItemDtoSchema);
        const uc = container.get<PortfolioItemUpdateUseCase>(APP_TOKENS.PortfolioItemUpdateUseCase);

        const result = await uc.execute(id, {
            ...(body.broker !== undefined && { broker: body.broker }),
            ...(body.targetWeight !== undefined && { targetWeight: body.targetWeight }),
            ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
            ...(body.notes !== undefined && { notes: body.notes ?? undefined }),
        });

        return result.match(
            (item) => c.json(toPortfolioItemDto(item)),
            (error) => errorJson(c, error),
        );
    });

    // DELETE /portfolio-items/:id
    app.delete("/:id", async (c) => {
        const id = parseId(c);
        const uc = container.get<PortfolioItemDeleteUseCase>(APP_TOKENS.PortfolioItemDeleteUseCase);

        return (await uc.execute(id)).match(
            () => c.body(null, 204),
            (error) => errorJson(c, error),
        );
    });

    return app;
}
