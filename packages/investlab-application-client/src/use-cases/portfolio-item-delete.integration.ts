import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
    API_TOKEN,
    apiError,
    createClientContainer,
    ITEM_ID,
    stubApi,
    useApiFake,
} from "../testing/api-harness.ts";
import { describeTransportFailures } from "../testing/transport-failures.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { PortfolioItemDeleteUseCase } from "./portfolio-item-delete.use-case.ts";

useApiFake();

function useCase(): PortfolioItemDeleteUseCase {
    return createClientContainer().get<PortfolioItemDeleteUseCase>(
        APP_TOKENS.PortfolioItemDeleteUseCase,
    );
}

const path = `/portfolio-items/${ITEM_ID}`;

describe("PortfolioItemDeleteUseCase against the faked API", () => {
    it("DELETEs the item with the bearer token and resolves on 204", async () => {
        const requests = stubApi("delete", path, () => new HttpResponse(null, { status: 204 }));

        const result = await useCase().execute(ITEM_ID);

        expect(result._unsafeUnwrap()).toBeUndefined();
        expect(requests).toEqual([
            {
                method: "DELETE",
                path,
                query: {},
                authorization: `Bearer ${API_TOKEN}`,
                contentType: null,
                body: undefined,
            },
        ]);
    });

    it("maps 404 PORTFOLIO_ITEM_NOT_FOUND to PortfolioItemNotFoundError for the requested id", async () => {
        stubApi("delete", path, () =>
            apiError(404, "PORTFOLIO_ITEM_NOT_FOUND", `Portfolio item not found: ${ITEM_ID}`),
        );

        const error = (await useCase().execute(ITEM_ID))._unsafeUnwrapErr();

        expect(error).toMatchObject({
            code: "PORTFOLIO_ITEM_NOT_FOUND",
            message: `Portfolio item not found: ${ITEM_ID}`,
        });
    });

    it("maps 422 VALIDATION_ERROR to ValidationError carrying the API message", async () => {
        stubApi("delete", "/portfolio-items/not-a-uuid", () =>
            apiError(422, "VALIDATION_ERROR", "Invalid id", [
                { path: "id", message: "Invalid uuid" },
            ]),
        );

        const error = (await useCase().execute("not-a-uuid"))._unsafeUnwrapErr();

        expect(error).toMatchObject({ code: "VALIDATION_ERROR", message: "Invalid id" });
    });

    it("maps 500 PERSISTENCE_ERROR to PersistenceError", async () => {
        stubApi("delete", path, () => apiError(500, "PERSISTENCE_ERROR", "Internal server error"));

        expect((await useCase().execute(ITEM_ID))._unsafeUnwrapErr().code).toBe(
            "PERSISTENCE_ERROR",
        );
    });

    // 204 carries no body, so there is no schema to violate.
    describeTransportFailures({ method: "delete", path }, () => useCase().execute(ITEM_ID));
});
