import { Hono } from "hono";
import { createInstrumentDtoSchema, updateInstrumentDtoSchema } from "@m0n0lab/investlab-portfolio";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/server";
import { replyEmpty, replyJson } from "../../core/mapper/result-http.mapper.ts";
import {
    validateId,
    validateJsonBody,
} from "../../core/middleware/request-validation.middleware.ts";
import { toInstrumentDto } from "../mapper/instrument-dto.mapper.ts";
import type {
    AssetClass,
    InstrumentType,
    Sector,
    UpdateInstrumentDto,
} from "@m0n0lab/investlab-portfolio";
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
        const uc = container.get(PORTFOLIO.InstrumentList);

        return replyJson(c, await uc.execute(), (instruments) => instruments.map(toInstrumentDto));
    });

    // POST /instruments
    app.post("/", validateJsonBody(createInstrumentDtoSchema), async (c) => {
        const body = c.get("body");
        const uc = container.get(PORTFOLIO.InstrumentCreate);

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
        const id = c.get("id");
        const body = c.get("body");
        const uc = container.get(PORTFOLIO.InstrumentUpdate);

        return replyJson(c, await uc.execute(id, toInstrumentChanges(body)), toInstrumentDto);
    });

    // DELETE /instruments/:id
    app.delete("/:id", validateId, async (c) => {
        const id = c.get("id");
        const uc = container.get(PORTFOLIO.InstrumentDelete);

        return replyEmpty(c, await uc.execute(id));
    });

    return app;
}
