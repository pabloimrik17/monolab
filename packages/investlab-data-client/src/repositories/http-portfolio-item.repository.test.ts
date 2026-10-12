import { HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
    InstrumentNotFoundError,
    PortfolioItem,
    PortfolioItemNotFoundError,
    TOKENS,
    ValidationError,
    type PortfolioItemRepository,
} from "@m0n0lab/investlab-domain";
import {
    apiError,
    createTestContainer,
    fakeApi,
    INSTRUMENT_ID,
    instrumentDto,
    ITEM_ID,
    portfolioItemDto,
    server,
} from "../testing/api-server.ts";
import type { ApiClientError } from "../api-client-error.ts";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function createRepository() {
    return createTestContainer().get<PortfolioItemRepository<ApiClientError>>(
        TOKENS.PortfolioItemRepository,
    );
}

function entity(props: Partial<Parameters<typeof PortfolioItem.reconstitute>[0]> = {}) {
    return PortfolioItem.reconstitute({
        id: ITEM_ID,
        instrumentId: INSTRUMENT_ID,
        broker: "Degiro",
        targetWeight: 60,
        currentValue: 1500.5,
        notes: "core holding",
        createdAt: new Date("2026-10-01T10:00:00.000Z"),
        updatedAt: new Date("2026-10-02T11:30:00.000Z"),
        ...props,
    });
}

const SERVER_ID = "c1d2e3f4-0a1b-4c2d-8e3f-5a6b7c8d9e0f";

const LIST_BODY = {
    items: [{ item: portfolioItemDto(), instrument: instrumentDto() }],
    instruments: [instrumentDto()],
};

describe("HttpPortfolioItemRepository", () => {
    describe("save", () => {
        it("posts the item fields and returns the entity the API created", async () => {
            let sent: unknown;
            server.use(
                fakeApi("post", "/portfolio-items", async ({ request }) => {
                    sent = await request.json();
                    return HttpResponse.json(portfolioItemDto({ id: SERVER_ID }), {
                        status: 201,
                    });
                }),
            );

            const result = await createRepository().save(entity());

            expect(sent).toEqual({
                instrumentId: INSTRUMENT_ID,
                broker: "Degiro",
                targetWeight: 60,
                currentValue: 1500.5,
                notes: "core holding",
            });
            expect(result._unsafeUnwrap().id).toBe(SERVER_ID);
        });

        it("maps INSTRUMENT_NOT_FOUND to InstrumentNotFoundError for the instrument sent", async () => {
            server.use(
                fakeApi("post", "/portfolio-items", () =>
                    apiError(404, "INSTRUMENT_NOT_FOUND", "Instrument not found"),
                ),
            );

            const error = (await createRepository().save(entity()))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(InstrumentNotFoundError);
            expect(error.message).toContain(INSTRUMENT_ID);
        });

        it("maps VALIDATION_ERROR to ValidationError keeping the API message", async () => {
            server.use(
                fakeApi("post", "/portfolio-items", () =>
                    apiError(422, "VALIDATION_ERROR", "Invalid request", [
                        { path: "broker", message: "Required" },
                    ]),
                ),
            );

            const error = (await createRepository().save(entity()))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toBe("Invalid request");
        });
    });

    describe("findAll", () => {
        it("lists the portfolio items as entities", async () => {
            server.use(fakeApi("get", "/portfolio-items", () => HttpResponse.json(LIST_BODY)));

            const items = (await createRepository().findAll())._unsafeUnwrap();

            expect(items.map((item) => item.id)).toEqual([ITEM_ID]);
            expect(items[0]?.notes).toBe("core holding");
        });
    });

    describe("findById", () => {
        it("returns the matching item", async () => {
            server.use(fakeApi("get", "/portfolio-items", () => HttpResponse.json(LIST_BODY)));

            const item = (await createRepository().findById(ITEM_ID))._unsafeUnwrap();

            expect(item?.id).toBe(ITEM_ID);
        });

        it("returns null when no item has that id", async () => {
            server.use(fakeApi("get", "/portfolio-items", () => HttpResponse.json(LIST_BODY)));

            const item = (await createRepository().findById("missing"))._unsafeUnwrap();

            expect(item).toBeNull();
        });
    });

    describe("update", () => {
        it("puts the editable fields and returns the updated entity", async () => {
            let sent: unknown;
            server.use(
                fakeApi("put", `/portfolio-items/${ITEM_ID}`, async ({ request }) => {
                    sent = await request.json();
                    return HttpResponse.json(portfolioItemDto({ broker: "IBKR" }));
                }),
            );

            const result = await createRepository().update(entity({ broker: "IBKR" }));

            expect(sent).toEqual({
                broker: "IBKR",
                targetWeight: 60,
                currentValue: 1500.5,
                notes: "core holding",
            });
            expect(result._unsafeUnwrap().broker).toBe("IBKR");
        });

        it("sends notes null when the entity has none, so the API clears them", async () => {
            let sent: Record<string, unknown> = {};
            server.use(
                fakeApi("put", `/portfolio-items/${ITEM_ID}`, async ({ request }) => {
                    sent = (await request.json()) as Record<string, unknown>;
                    const { notes: _notes, ...rest } = portfolioItemDto();
                    return HttpResponse.json(rest);
                }),
            );

            const result = await createRepository().update(entity({ notes: undefined }));

            expect(sent["notes"]).toBeNull();
            expect(result._unsafeUnwrap().notes).toBeUndefined();
        });

        it("maps PORTFOLIO_ITEM_NOT_FOUND to PortfolioItemNotFoundError for that id", async () => {
            server.use(
                fakeApi("put", `/portfolio-items/${ITEM_ID}`, () =>
                    apiError(404, "PORTFOLIO_ITEM_NOT_FOUND", "Portfolio item not found"),
                ),
            );

            const error = (await createRepository().update(entity()))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(PortfolioItemNotFoundError);
            expect(error.message).toContain(ITEM_ID);
        });
    });

    describe("delete", () => {
        it("resolves once the API answers 204", async () => {
            server.use(
                fakeApi(
                    "delete",
                    `/portfolio-items/${ITEM_ID}`,
                    () => new HttpResponse(null, { status: 204 }),
                ),
            );

            const result = await createRepository().delete(ITEM_ID);

            expect(result.isOk()).toBe(true);
        });

        it("maps PORTFOLIO_ITEM_NOT_FOUND to PortfolioItemNotFoundError", async () => {
            server.use(
                fakeApi("delete", `/portfolio-items/${ITEM_ID}`, () =>
                    apiError(404, "PORTFOLIO_ITEM_NOT_FOUND", "Portfolio item not found"),
                ),
            );

            const error = (await createRepository().delete(ITEM_ID))._unsafeUnwrapErr();

            expect(error).toBeInstanceOf(PortfolioItemNotFoundError);
        });
    });
});
