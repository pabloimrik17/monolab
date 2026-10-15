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
import type { PortfolioItemUpdateUseCase } from "./portfolio-item-update.use-case.ts";

useApiFake();

function useCase(): PortfolioItemUpdateUseCase {
    return createClientContainer().get<PortfolioItemUpdateUseCase>(
        APP_TOKENS.PortfolioItemUpdateUseCase,
    );
}

const putPath = `/portfolio-items/${ITEM_ID}`;

/** The `updatedAt` of the listed `portfolioItemDto()`: the version the caller last read. */
const READ_VERSION = new Date("2026-10-02T11:30:00.000Z");

/** The API has no single-item read: the use case finds the item through the list endpoint. */
function stubList(items = [portfolioItemDto()]) {
    return stubApi("get", "/portfolio-items", () =>
        HttpResponse.json({
            items: items.map((item) => ({ item, instrument: instrumentDto() })),
            instruments: [instrumentDto()],
        }),
    );
}

describe("PortfolioItemUpdateUseCase against the faked API", () => {
    it("reads the list, PUTs the merged item and returns the stored entity", async () => {
        const listRequests = stubList();
        const putRequests = stubApi("put", putPath, () =>
            HttpResponse.json(portfolioItemDto({ targetWeight: 25 })),
        );

        const item = (
            await useCase().execute(ITEM_ID, { targetWeight: 25 }, READ_VERSION)
        )._unsafeUnwrap();

        expect(listRequests).toEqual([
            expect.objectContaining({
                method: "GET",
                path: "/portfolio-items",
                authorization: `Bearer ${API_TOKEN}`,
            }),
        ]);
        expect(putRequests).toEqual([
            {
                method: "PUT",
                path: putPath,
                query: {},
                authorization: `Bearer ${API_TOKEN}`,
                contentType: "application/json",
                // Untouched fields travel with the change; notes are kept.
                body: {
                    broker: "Degiro",
                    targetWeight: 25,
                    currentValue: 1500.5,
                    notes: "core holding",
                    expectedUpdatedAt: "2026-10-02T11:30:00.000Z",
                },
            },
        ]);
        expect(item).toMatchObject({ id: ITEM_ID, targetWeight: 25, broker: "Degiro" });
    });

    it("sends notes: null when the notes are cleared", async () => {
        stubList();
        const putRequests = stubApi("put", putPath, () => {
            const { notes: _notes, ...withoutNotes } = portfolioItemDto();
            return HttpResponse.json(withoutNotes);
        });

        const item = (
            await useCase().execute(ITEM_ID, { notes: undefined }, READ_VERSION)
        )._unsafeUnwrap();

        expect(putRequests[0]?.body).toMatchObject({ notes: null });
        expect(item.notes).toBeUndefined();
    });

    it("returns PortfolioItemNotFoundError without a PUT when the id is not in the list", async () => {
        stubList([]);
        const putRequests = stubApi("put", putPath, () => HttpResponse.json(portfolioItemDto()));

        const error = (
            await useCase().execute(ITEM_ID, { targetWeight: 5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toMatchObject({
            code: "PORTFOLIO_ITEM_NOT_FOUND",
            message: `Portfolio item not found: ${ITEM_ID}`,
        });
        expect(putRequests).toHaveLength(0);
    });

    it("returns PortfolioItemConflictError without a PUT when the read version is stale", async () => {
        stubList([portfolioItemDto({ updatedAt: "2026-10-03T08:00:00.000Z" })]);
        const putRequests = stubApi("put", putPath, () => HttpResponse.json(portfolioItemDto()));

        const error = (
            await useCase().execute(ITEM_ID, { targetWeight: 5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toMatchObject({
            code: "PORTFOLIO_ITEM_CONFLICT",
            message: `Portfolio item ${ITEM_ID} was changed by another request; reload and try again`,
        });
        expect(putRequests).toHaveLength(0);
    });

    it("returns ValidationError without a PUT when the change is invalid", async () => {
        stubList();
        const putRequests = stubApi("put", putPath, () => HttpResponse.json(portfolioItemDto()));

        const error = (
            await useCase().execute(ITEM_ID, { targetWeight: -5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error.code).toBe("VALIDATION_ERROR");
        expect(putRequests).toHaveLength(0);
    });

    it("maps 404 PORTFOLIO_ITEM_NOT_FOUND on the PUT (item deleted meanwhile)", async () => {
        stubList();
        stubApi("put", putPath, () =>
            apiError(404, "PORTFOLIO_ITEM_NOT_FOUND", `Portfolio item not found: ${ITEM_ID}`),
        );

        const error = (
            await useCase().execute(ITEM_ID, { targetWeight: 5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toMatchObject({
            code: "PORTFOLIO_ITEM_NOT_FOUND",
            message: `Portfolio item not found: ${ITEM_ID}`,
        });
    });

    it("maps 409 PORTFOLIO_ITEM_CONFLICT on the PUT (item changed meanwhile)", async () => {
        stubList();
        stubApi("put", putPath, () =>
            apiError(409, "PORTFOLIO_ITEM_CONFLICT", "Portfolio item changed by another request"),
        );

        const error = (
            await useCase().execute(ITEM_ID, { targetWeight: 5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toMatchObject({
            code: "PORTFOLIO_ITEM_CONFLICT",
            message: `Portfolio item ${ITEM_ID} was changed by another request; reload and try again`,
        });
    });

    it("maps 422 VALIDATION_ERROR on the PUT to ValidationError carrying the API message", async () => {
        stubList();
        stubApi("put", putPath, () =>
            apiError(422, "VALIDATION_ERROR", "Invalid request body", [
                { path: "broker", message: "String must contain at most 100 character(s)" },
            ]),
        );

        const error = (
            await useCase().execute(ITEM_ID, { targetWeight: 5 }, READ_VERSION)
        )._unsafeUnwrapErr();

        expect(error).toMatchObject({ code: "VALIDATION_ERROR", message: "Invalid request body" });
    });

    describe("when reading the list fails", () => {
        describeTransportFailures(
            { method: "get", path: "/portfolio-items" },
            () => useCase().execute(ITEM_ID, { targetWeight: 5 }, READ_VERSION),
            { malformedBody: { items: "nope", instruments: [] } },
        );
    });

    describe("when the PUT fails", () => {
        describeTransportFailures(
            { method: "put", path: putPath },
            () => {
                stubList();
                return useCase().execute(ITEM_ID, { targetWeight: 5 }, READ_VERSION);
            },
            { malformedBody: { ...portfolioItemDto(), targetWeight: 250 } },
        );
    });
});
