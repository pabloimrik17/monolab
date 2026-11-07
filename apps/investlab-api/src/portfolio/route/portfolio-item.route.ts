import { Hono } from "hono";
import { replyEmpty, replyJson } from "#core/mapper/result-http.mapper.ts";
import { validateId, validateJsonBody } from "#core/middleware/request-validation.middleware.ts";
import { toInstrumentDto } from "#portfolio/mapper/instrument-dto.mapper.ts";
import {
    createPortfolioItemDtoSchema,
    updatePortfolioItemDtoSchema,
} from "@m0n0lab/investlab-portfolio";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/server";
import type {
    PortfolioItem,
    PortfolioItemDto,
    PortfolioItemListDto,
} from "@m0n0lab/investlab-portfolio";
import type { PortfolioItemList } from "@m0n0lab/investlab-portfolio/server";
import type { Container } from "inversify";

function toPortfolioItemDto(item: PortfolioItem): PortfolioItemDto {
    return {
        id: item.id,
        instrumentId: item.instrumentId,
        broker: item.broker,
        targetWeight: item.targetWeight,
        currentValue: item.currentValue,
        ...(item.notes != null && { notes: item.notes }),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
    };
}

function toPortfolioItemListDto({ items, instruments }: PortfolioItemList): PortfolioItemListDto {
    return {
        items: items.map(({ item, instrument }) => ({
            item: toPortfolioItemDto(item),
            instrument: toInstrumentDto(instrument),
        })),
        instruments: instruments.map(toInstrumentDto),
    };
}

export function portfolioItemRoutes(container: Container) {
    const app = new Hono();

    app.get("/", async (c) => {
        const uc = container.get(PORTFOLIO.ItemList);

        return replyJson(c, await uc.execute(), toPortfolioItemListDto);
    });

    app.post("/", validateJsonBody(createPortfolioItemDtoSchema), async (c) => {
        const body = c.req.valid("json");
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
        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
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
        const { id } = c.req.valid("param");
        const uc = container.get(PORTFOLIO.ItemDelete);

        return replyEmpty(c, await uc.execute(id));
    });

    return app;
}
