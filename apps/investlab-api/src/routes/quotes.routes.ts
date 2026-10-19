import { Hono } from "hono";
import { quoteListQueryDtoSchema } from "@m0n0lab/investlab-quotes";
import { QUOTES } from "@m0n0lab/investlab-quotes/server";
import { parseWith } from "../errors/parse-request.ts";
import { toQuoteDto } from "../serializers/dto-serializers.ts";
import { replyJson } from "./reply.ts";
import type { Container } from "inversify";

export function quoteRoutes(container: Container) {
    return new Hono().get("/", async (c) => {
        const { symbols } = parseWith(quoteListQueryDtoSchema, c.req.query());
        const uc = container.get(QUOTES.List);

        return replyJson(c, await uc.execute(symbols), (quotes) => quotes.map(toQuoteDto));
    });
}
