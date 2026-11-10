import { Hono } from "hono";
import { toInstrumentDto } from "#catalog/mapper/instrument-dto.mapper.ts";
import { replyEmpty, replyJson } from "#core/mapper/result-http.mapper.ts";
import { validateId, validateJsonBody } from "#core/middleware/request-validation.middleware.ts";
import { createInstrumentDtoSchema, updateInstrumentDtoSchema } from "@m0n0lab/investlab-catalog";
import { CATALOG } from "@m0n0lab/investlab-catalog/server";
import type {
    AssetClass,
    InstrumentType,
    Sector,
    UpdateInstrumentDto,
} from "@m0n0lab/investlab-catalog";
import type { Container } from "inversify";

/** Omitted fields stay as they are; `null` clears `exchange`, `sector` or `replicates`. */
function toInstrumentChanges(body: UpdateInstrumentDto) {
    return {
        symbol: body.symbol,
        name: body.name,
        type: body.type as InstrumentType | undefined,
        assetClass: body.assetClass as AssetClass | undefined,
        quotable: body.quotable,
        ...(body.exchange !== undefined && { exchange: body.exchange ?? undefined }),
        ...(body.sector !== undefined && {
            sector: (body.sector ?? undefined) as Sector | undefined,
        }),
        ...(body.replicates !== undefined && { replicates: body.replicates ?? undefined }),
    };
}

export function instrumentRoutes(container: Container) {
    const app = new Hono();

    // GET /instruments
    app.get("/", async (c) => {
        const uc = container.get(CATALOG.InstrumentList);

        return replyJson(c, await uc.execute(), (instruments) => instruments.map(toInstrumentDto));
    });

    // POST /instruments
    app.post("/", validateJsonBody(createInstrumentDtoSchema), async (c) => {
        const body = c.req.valid("json");
        const uc = container.get(CATALOG.InstrumentCreate);

        const result = await uc.execute({
            ...body,
            type: body.type as InstrumentType,
            assetClass: body.assetClass as AssetClass,
            sector: body.sector as Sector | undefined,
        });

        return replyJson(c, result, toInstrumentDto, 201);
    });

    // PUT /instruments/:id
    app.put("/:id", validateId, validateJsonBody(updateInstrumentDtoSchema), async (c) => {
        const { id } = c.req.valid("param");
        const body = c.req.valid("json");
        const uc = container.get(CATALOG.InstrumentUpdate);

        return replyJson(c, await uc.execute(id, toInstrumentChanges(body)), toInstrumentDto);
    });

    // DELETE /instruments/:id
    app.delete("/:id", validateId, async (c) => {
        const { id } = c.req.valid("param");
        const uc = container.get(CATALOG.InstrumentDelete);

        return replyEmpty(c, await uc.execute(id));
    });

    return app;
}
