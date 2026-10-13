import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
    API_TOKEN,
    apiError,
    createClientContainer,
    INSTRUMENT_ID,
    ITEM_ID,
    portfolioItemDto,
    stubApi,
    useApiFake,
} from "../testing/api-harness.ts";
import { describeTransportFailures } from "../testing/transport-failures.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { PortfolioItemCreateUseCase } from "./portfolio-item-create.use-case.ts";

useApiFake();

function useCase(): PortfolioItemCreateUseCase {
    return createClientContainer().get<PortfolioItemCreateUseCase>(
        APP_TOKENS.PortfolioItemCreateUseCase,
    );
}

const props = { instrumentId: INSTRUMENT_ID, broker: "Degiro", targetWeight: 60 };

describe("PortfolioItemCreateUseCase against the faked API", () => {
    it("POSTs the item as JSON with the bearer token and returns the stored entity", async () => {
        const requests = stubApi("post", "/portfolio-items", () =>
            HttpResponse.json(portfolioItemDto(), { status: 201 }),
        );

        const item = (
            await useCase().execute({ ...props, currentValue: 1500.5, notes: "core holding" })
        )._unsafeUnwrap();

        expect(requests).toEqual([
            {
                method: "POST",
                path: "/portfolio-items",
                query: {},
                authorization: `Bearer ${API_TOKEN}`,
                contentType: "application/json",
                body: {
                    instrumentId: INSTRUMENT_ID,
                    broker: "Degiro",
                    targetWeight: 60,
                    currentValue: 1500.5,
                    notes: "core holding",
                },
            },
        ]);
        // The entity comes from the API response, not from the locally built one.
        expect(item).toMatchObject({
            id: ITEM_ID,
            instrumentId: INSTRUMENT_ID,
            broker: "Degiro",
            targetWeight: 60,
            currentValue: 1500.5,
            notes: "core holding",
            createdAt: new Date("2026-10-01T10:00:00.000Z"),
        });
    });

    it("defaults currentValue to 0 and leaves notes off the wire", async () => {
        const requests = stubApi("post", "/portfolio-items", () =>
            HttpResponse.json(portfolioItemDto({ currentValue: 0 }), { status: 201 }),
        );

        await useCase().execute(props);

        expect(requests[0]?.body).toEqual({ ...props, currentValue: 0 });
    });

    it("returns ValidationError without calling the API when the item is invalid", async () => {
        const requests = stubApi("post", "/portfolio-items", () =>
            HttpResponse.json(portfolioItemDto(), { status: 201 }),
        );

        const error = (await useCase().execute({ ...props, targetWeight: -1 }))._unsafeUnwrapErr();

        expect(error.code).toBe("VALIDATION_ERROR");
        expect(requests).toHaveLength(0);
    });

    it("maps 422 VALIDATION_ERROR to ValidationError carrying the API message", async () => {
        stubApi("post", "/portfolio-items", () =>
            apiError(422, "VALIDATION_ERROR", "Invalid request body", [
                { path: "targetWeight", message: "Number must be less than or equal to 100" },
            ]),
        );

        const error = (await useCase().execute(props))._unsafeUnwrapErr();

        expect(error).toMatchObject({ code: "VALIDATION_ERROR", message: "Invalid request body" });
    });

    it("maps 404 INSTRUMENT_NOT_FOUND to InstrumentNotFoundError for the requested instrument", async () => {
        stubApi("post", "/portfolio-items", () =>
            apiError(404, "INSTRUMENT_NOT_FOUND", `Instrument not found: ${INSTRUMENT_ID}`),
        );

        const error = (await useCase().execute(props))._unsafeUnwrapErr();

        expect(error).toMatchObject({
            code: "INSTRUMENT_NOT_FOUND",
            message: `Instrument not found: ${INSTRUMENT_ID}`,
        });
    });

    it("maps 500 PERSISTENCE_ERROR to PersistenceError", async () => {
        stubApi("post", "/portfolio-items", () =>
            apiError(500, "PERSISTENCE_ERROR", "Internal server error"),
        );

        expect((await useCase().execute(props))._unsafeUnwrapErr().code).toBe("PERSISTENCE_ERROR");
    });

    describeTransportFailures(
        { method: "post", path: "/portfolio-items" },
        () => useCase().execute(props),
        { malformedBody: { ...portfolioItemDto(), createdAt: "not-a-date" } },
    );
});
