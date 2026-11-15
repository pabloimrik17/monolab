import { Hono } from "hono";
import { replyJson } from "#core/mapper/result-http.mapper.ts";
import { validateQuery } from "#core/middleware/request-validation.middleware.ts";
import { quoteListQueryDtoSchema } from "@m0n0lab/investlab-quotes";
import { QUOTES } from "@m0n0lab/investlab-quotes/server";
import type { Quote, QuoteDto } from "@m0n0lab/investlab-quotes";
import type { Container } from "inversify";

function toQuoteDto(quote: Quote): QuoteDto {
    return {
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        updatedAt: quote.updatedAt.toISOString(),
    };
}

export function quoteRoutes(container: Container) {
    return new Hono().get("/", validateQuery(quoteListQueryDtoSchema), async (c) => {
        const { symbols } = c.req.valid("query");
        const uc = container.get(QUOTES.List);

        return replyJson(c, await uc.execute(symbols), (quotes) => quotes.map(toQuoteDto));
    });
}
