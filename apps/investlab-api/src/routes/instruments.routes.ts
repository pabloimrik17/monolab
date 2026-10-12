import { Hono } from "hono";
import { APP_TOKENS, type InstrumentListUseCase } from "@m0n0lab/investlab-application-server";
import { errorJson } from "../errors/error-mapping.ts";
import { toInstrumentDto } from "../serializers/dto-serializers.ts";
import type { Container } from "inversify";

export function instrumentRoutes(container: Container) {
    return new Hono().get("/", async (c) => {
        const uc = container.get<InstrumentListUseCase>(APP_TOKENS.InstrumentListUseCase);

        return (await uc.execute()).match(
            (instruments) => c.json(instruments.map(toInstrumentDto)),
            (error) => errorJson(c, error),
        );
    });
}
