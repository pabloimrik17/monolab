import { Hono } from "hono";
import { quoteListQueryDtoSchema } from "@m0n0lab/investlab-quotes";
import { QUOTES } from "@m0n0lab/investlab-quotes/server";
import { replyJson } from "../../core/mapper/result-http.mapper.ts";
import { validateQuery } from "../../core/middleware/request-validation.middleware.ts";
import { toQuoteDto } from "../../serializers/dto-serializers.ts";
import type { Container } from "inversify";

export function quoteRoutes(container: Container) {
    return new Hono().get("/", validateQuery(quoteListQueryDtoSchema), async (c) => {
        const { symbols } = c.get("query");
        const uc = container.get(QUOTES.List);

        return replyJson(c, await uc.execute(symbols), (quotes) => quotes.map(toQuoteDto));
    });
}
