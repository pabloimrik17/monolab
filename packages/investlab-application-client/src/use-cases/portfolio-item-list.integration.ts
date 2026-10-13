import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
    API_TOKEN,
    apiError,
    createClientContainer,
    instrumentDto,
    ITEM_ID,
    portfolioItemDto,
    stubApi,
    useApiFake,
} from "../testing/api-harness.ts";
import { describeTransportFailures } from "../testing/transport-failures.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { PortfolioItemListUseCase } from "./portfolio-item-list.use-case.ts";

useApiFake();

function useCase(): PortfolioItemListUseCase {
    return createClientContainer().get<PortfolioItemListUseCase>(
        APP_TOKENS.PortfolioItemListUseCase,
    );
}

const listBody = () => ({
    items: [{ item: portfolioItemDto(), instrument: instrumentDto() }],
    instruments: [instrumentDto()],
});

describe("PortfolioItemListUseCase against the faked API", () => {
    it("combines GET /portfolio-items and GET /instruments into entities", async () => {
        const itemRequests = stubApi("get", "/portfolio-items", () =>
            HttpResponse.json(listBody()),
        );
        const instrumentRequests = stubApi("get", "/instruments", () =>
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

        const list = (await useCase().execute())._unsafeUnwrap();

        for (const [requests, path] of [
            [itemRequests, "/portfolio-items"],
            [instrumentRequests, "/instruments"],
        ] as const) {
            expect(requests).toEqual([
                expect.objectContaining({
                    method: "GET",
                    path,
                    authorization: `Bearer ${API_TOKEN}`,
                }),
            ]);
        }
        expect(list.items).toHaveLength(1);
        expect(list.items[0]?.item).toMatchObject({
            id: ITEM_ID,
            broker: "Degiro",
            targetWeight: 60,
            currentValue: 1500.5,
            notes: "core holding",
            createdAt: new Date("2026-10-01T10:00:00.000Z"),
            updatedAt: new Date("2026-10-02T11:30:00.000Z"),
        });
        expect(list.items[0]?.instrument).toMatchObject({ symbol: "VWCE", quotable: true });
        expect(list.instruments.map((instrument) => instrument.symbol)).toEqual(["VWCE", "BTC"]);
    });

    it("returns empty lists", async () => {
        stubApi("get", "/portfolio-items", () => HttpResponse.json({ items: [], instruments: [] }));
        stubApi("get", "/instruments", () => HttpResponse.json([]));

        expect((await useCase().execute())._unsafeUnwrap()).toEqual({ items: [], instruments: [] });
    });

    it("maps 500 PERSISTENCE_ERROR to PersistenceError", async () => {
        stubApi("get", "/portfolio-items", () =>
            apiError(500, "PERSISTENCE_ERROR", "Internal server error"),
        );
        stubApi("get", "/instruments", () => HttpResponse.json([]));

        expect((await useCase().execute())._unsafeUnwrapErr()).toMatchObject({
            code: "PERSISTENCE_ERROR",
        });
    });

    it("fails when only the instrument catalog is unreachable", async () => {
        stubApi("get", "/portfolio-items", () => HttpResponse.json(listBody()));
        stubApi("get", "/instruments", () => HttpResponse.error());

        expect((await useCase().execute())._unsafeUnwrapErr()).toMatchObject({
            code: "NETWORK_ERROR",
        });
    });

    describe("with a healthy instrument catalog", () => {
        const respondWithCatalog = () =>
            stubApi("get", "/instruments", () => HttpResponse.json([]));

        describeTransportFailures(
            { method: "get", path: "/portfolio-items" },
            () => {
                respondWithCatalog();
                return useCase().execute();
            },
            {
                malformedBody: {
                    items: [{ item: { ...portfolioItemDto(), targetWeight: 250 }, instrument: {} }],
                    instruments: [],
                },
            },
        );
    });
});
