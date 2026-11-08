import { Hono } from "hono";
import { z } from "zod";
import { replyEmpty, replyJson } from "#core/mapper/result-http.mapper.ts";
import {
    validateId,
    validateJsonBody,
    validateQuery,
} from "#core/middleware/request-validation.middleware.ts";
import { toEntryDto, toEntryListDto } from "#roger/mapper/entry-dto.mapper.ts";
import {
    createEntryDtoSchema,
    editEntryDtoSchema,
    entryListViewSchema,
    reEnterEntryDtoSchema,
    transitionEntryDtoSchema,
    type RogerState,
} from "@m0n0lab/investlab-roger";
import { ROGER, type EntryCreateProps } from "@m0n0lab/investlab-roger/server";
import type { Sector } from "@m0n0lab/investlab-catalog";
import type { Container } from "inversify";

const listQuerySchema = z.object({ view: entryListViewSchema });

/** The trade fields of a body, leaving out `to`, `expectedUpdatedAt` and the instrument. */
function valuesOf(body: {
    entryPrice?: number | undefined;
    quantity?: number | undefined;
    buyCommission?: number | undefined;
    buyDate?: string | undefined;
    exitPrice?: number | undefined;
    sellCommission?: number | undefined;
    sellDate?: string | undefined;
}) {
    return {
        entryPrice: body.entryPrice,
        quantity: body.quantity,
        buyCommission: body.buyCommission,
        buyDate: body.buyDate,
        exitPrice: body.exitPrice,
        sellCommission: body.sellCommission,
        sellDate: body.sellDate,
    };
}

export function entryRoutes(container: Container) {
    const app = new Hono();

    app.get("/", validateQuery(listQuerySchema), async (c) => {
        const { view } = c.req.valid("query");
        const uc = container.get(ROGER.EntryList);

        return replyJson(c, await uc.execute(view), toEntryListDto);
    });

    app.post("/", validateJsonBody(createEntryDtoSchema), async (c) => {
        const body = c.req.valid("json");
        const uc = container.get(ROGER.EntryCreate);
        const draft = { ...valuesOf(body), state: body.state as RogerState };
        // The schema guarantees exactly one of the two.
        const props: EntryCreateProps =
            body.newInstrument !== undefined
                ? {
                      ...draft,
                      newInstrument: {
                          symbol: body.newInstrument.symbol,
                          name: body.newInstrument.name,
                          sector: body.newInstrument.sector as Sector | undefined,
                      },
                  }
                : { ...draft, instrumentId: body.instrumentId! };

        return replyJson(c, await uc.execute(props), toEntryDto, 201);
    });

    app.put("/:id", validateId, validateJsonBody(editEntryDtoSchema), async (c) => {
        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const uc = container.get(ROGER.EntryEdit);

        const result = await uc.execute(id, valuesOf(body), new Date(body.expectedUpdatedAt));

        return replyJson(c, result, toEntryDto);
    });

    app.delete("/:id", validateId, async (c) => {
        const { id } = c.req.valid("param");
        const uc = container.get(ROGER.EntryDelete);

        return replyEmpty(c, await uc.execute(id));
    });

    app.post(
        "/:id/transitions",
        validateId,
        validateJsonBody(transitionEntryDtoSchema),
        async (c) => {
            const { id } = c.req.valid("param");
            const body = c.req.valid("json");
            const uc = container.get(ROGER.EntryTransition);

            const result = await uc.execute(
                id,
                body.to as RogerState,
                valuesOf(body),
                new Date(body.expectedUpdatedAt),
            );

            return replyJson(c, result, toEntryDto);
        },
    );

    app.post("/:id/re-entries", validateId, validateJsonBody(reEnterEntryDtoSchema), async (c) => {
        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const uc = container.get(ROGER.EntryReEnter);

        const result = await uc.execute(id, {
            entryPrice: body.entryPrice,
            quantity: body.quantity,
        });

        return replyJson(c, result, toEntryDto, 201);
    });

    return app;
}
