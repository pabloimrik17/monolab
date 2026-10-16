import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
    API_TOKEN,
    createClientContainer,
    instrumentDto,
    stubApi,
    useApiFake,
} from "../testing/api-harness.ts";
import { describeTransportFailures } from "../testing/transport-failures.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { InstrumentListUseCase } from "./instrument-list.use-case.ts";

useApiFake();

function useCase(): InstrumentListUseCase {
    return createClientContainer().get<InstrumentListUseCase>(APP_TOKENS.InstrumentListUseCase);
}

describe("InstrumentListUseCase against the faked API", () => {
    it("GETs /instruments with the bearer token and maps the catalog to entities", async () => {
        const requests = stubApi("get", "/instruments", () =>
            HttpResponse.json([
                instrumentDto(),
                instrumentDto({
                    id: "0c9e8d7b-6a5f-4e3d-8c2b-1a0f9e8d7c6b",
                    symbol: "BTC",
                    name: "Bitcoin",
                    type: "crypto",
                    assetClass: "crypto",
                    quotable: false,
                }),
            ]),
        );

        const instruments = (await useCase().execute())._unsafeUnwrap();

        expect(requests).toEqual([
            expect.objectContaining({
                method: "GET",
                path: "/instruments",
                authorization: `Bearer ${API_TOKEN}`,
            }),
        ]);
        expect(instruments).toHaveLength(2);
        expect(instruments[0]).toMatchObject({
            id: "5b0f6f2e-0c1d-4a39-9b36-3f4b2a1c7d10",
            symbol: "VWCE",
            type: "etf",
            assetClass: "equity",
            exchange: "XETRA",
            quotable: true,
        });
        expect(instruments[1]).toMatchObject({ symbol: "BTC", type: "crypto", quotable: false });
    });

    it("returns an empty catalog", async () => {
        stubApi("get", "/instruments", () => HttpResponse.json([]));

        expect((await useCase().execute())._unsafeUnwrap()).toEqual([]);
    });

    describeTransportFailures({ method: "get", path: "/instruments" }, () => useCase().execute(), {
        malformedBody: [{ ...instrumentDto(), id: "not-a-uuid" }],
    });
});
