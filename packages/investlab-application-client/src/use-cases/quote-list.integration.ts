import { HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
    API_TOKEN,
    apiError,
    createClientContainer,
    quoteDto,
    stubApi,
    useApiFake,
} from "../testing/api-harness.ts";
import { describeTransportFailures } from "../testing/transport-failures.ts";
import { APP_TOKENS } from "../tokens.ts";
import type { QuoteListUseCase } from "./quote-list.use-case.ts";

useApiFake();

function useCase(): QuoteListUseCase {
    return createClientContainer().get<QuoteListUseCase>(APP_TOKENS.QuoteListUseCase);
}

describe("QuoteListUseCase against the faked API", () => {
    it("GETs /quotes with the comma-joined symbols and returns Quote entities as an array", async () => {
        const requests = stubApi("get", "/quotes", () =>
            HttpResponse.json([quoteDto("SPY"), quoteDto("QQQ", { price: 480.1 })]),
        );

        const quotes = (await useCase().execute(["SPY", "QQQ"]))._unsafeUnwrap();

        expect(requests).toEqual([
            expect.objectContaining({
                method: "GET",
                path: "/quotes",
                query: { symbols: "SPY,QQQ" },
                authorization: `Bearer ${API_TOKEN}`,
            }),
        ]);
        expect(quotes).toEqual([
            {
                symbol: "SPY",
                price: 101.25,
                change: 1.25,
                changePercent: 1.25,
                updatedAt: new Date("2026-10-12T09:30:00.000Z"),
            },
            expect.objectContaining({ symbol: "QQQ", price: 480.1 }),
        ]);
    });

    it("returns only the symbols the API knows", async () => {
        stubApi("get", "/quotes", () => HttpResponse.json([quoteDto("SPY")]));

        const quotes = (await useCase().execute(["SPY", "NOPE"]))._unsafeUnwrap();

        expect(quotes.map((quote) => quote.symbol)).toEqual(["SPY"]);
    });

    it("skips the request when there are no symbols", async () => {
        const requests = stubApi("get", "/quotes", () => HttpResponse.json([]));

        expect((await useCase().execute([]))._unsafeUnwrap()).toEqual([]);
        expect(requests).toHaveLength(0);
    });

    it("maps 422 VALIDATION_ERROR to ValidationError carrying the API message", async () => {
        stubApi("get", "/quotes", () =>
            apiError(422, "VALIDATION_ERROR", "At least one symbol is required", [
                { path: "symbols", message: "At least one symbol is required" },
            ]),
        );

        const error = (await useCase().execute([" "]))._unsafeUnwrapErr();

        expect(error).toMatchObject({
            code: "VALIDATION_ERROR",
            message: "At least one symbol is required",
        });
    });

    describeTransportFailures(
        { method: "get", path: "/quotes" },
        () => useCase().execute(["SPY"]),
        {
            malformedBody: [{ ...quoteDto("SPY"), updatedAt: "yesterday" }],
        },
    );
});
