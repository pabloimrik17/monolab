import { Hono } from "hono";
import { APP_TOKENS, type QuoteListUseCase } from "@m0n0lab/investlab-application-server";
import { quoteListQueryDtoSchema } from "@m0n0lab/investlab-data-contracts";
import { errorJson } from "../errors/error-mapping.ts";
import { parseWith } from "../errors/parse-request.ts";
import { toQuoteDto } from "../serializers/dto-serializers.ts";
import type { Container } from "inversify";

export function quoteRoutes(container: Container) {
    return new Hono().get("/", async (c) => {
        const { symbols } = parseWith(quoteListQueryDtoSchema, c.req.query());
        const uc = container.get<QuoteListUseCase>(APP_TOKENS.QuoteListUseCase);

        return (await uc.execute(symbols)).match(
            (quotes) => c.json(quotes.map(toQuoteDto)),
            (error) => errorJson(c, error),
        );
    });
}
