import { Hono } from "hono";
import { createInstrumentDtoSchema, updateInstrumentDtoSchema } from "@m0n0lab/investlab-portfolio";
import { PORTFOLIO } from "@m0n0lab/investlab-portfolio/server";
import { parseId, parseJsonBody } from "../errors/parse-request.ts";
import { toInstrumentDto } from "../serializers/dto-serializers.ts";
import { replyEmpty, replyJson } from "./reply.ts";
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
    app.post("/", async (c) => {
        const body = await parseJsonBody(c, createInstrumentDtoSchema);
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
    app.put("/:id", async (c) => {
        const id = parseId(c);
        const body = await parseJsonBody(c, updateInstrumentDtoSchema);
        const uc = container.get(PORTFOLIO.InstrumentUpdate);

        return replyJson(c, await uc.execute(id, toInstrumentChanges(body)), toInstrumentDto);
    });

    // DELETE /instruments/:id
    app.delete("/:id", async (c) => {
        const id = parseId(c);
        const uc = container.get(PORTFOLIO.InstrumentDelete);

        return replyEmpty(c, await uc.execute(id));
    });

    return app;
}
