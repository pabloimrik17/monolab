import { http, HttpResponse } from "msw/http";
import { z } from "zod";
import { TICKERS_STORAGE_KEY } from "#data/client/repository/ticker-storage.repository.ts";
import { quoteListQueryDtoSchema, type QuoteDto } from "#data/shared/dto/quote.dto.ts";
import { API_URL, investlabApi, storage } from "./vitest-integration-setup.ts";
import type { ApiErrorDto } from "@m0n0lab/investlab-core";

/**
 * The API has these quotes; any other symbol has none. Like the API, it normalizes the queried
 * symbols and refuses a query that has none.
 */
export function givenQuotesFor(quotes: Readonly<Record<string, Omit<QuoteDto, "symbol">>>): void {
    investlabApi.use(
        http.get(`${API_URL}/quotes`, ({ request }) => {
            const query = quoteListQueryDtoSchema.safeParse({
                symbols: new URL(request.url).searchParams.get("symbols"),
            });
            if (!query.success) {
                const body: ApiErrorDto = {
                    code: "VALIDATION_ERROR",
                    message: "Request validation failed",
                    statusCode: 422,
                    issues: query.error.issues.map((issue) => ({
                        path: issue.path.map(String).join("."),
                        message: issue.message,
                    })),
                };
                return HttpResponse.json(body, { status: 422 });
            }
            return HttpResponse.json(
                query.data.symbols.flatMap((symbol): QuoteDto[] => {
                    const quote = quotes[symbol];
                    return quote ? [{ symbol, ...quote }] : [];
                }),
            );
        }),
    );
}

/** The API cannot be reached. */
export function givenApiUnavailable(): void {
    investlabApi.use(http.all(`${API_URL}/*`, () => HttpResponse.error()));
}

/** The API refuses the web's token. */
export function givenTokenRejected(): void {
    const body: ApiErrorDto = {
        code: "UNAUTHORIZED",
        message: "Invalid or missing bearer token",
        statusCode: 401,
    };
    investlabApi.use(http.all(`${API_URL}/*`, () => HttpResponse.json(body, { status: 401 })));
}

export function givenMarketDataUnavailable(): void {
    const body: ApiErrorDto = {
        code: "MARKET_DATA_UNAVAILABLE",
        message: "Internal server error",
        statusCode: 503,
    };
    investlabApi.use(http.get(`${API_URL}/quotes`, () => HttpResponse.json(body, { status: 503 })));
}

/** The browser holds this text under the key the followed tickers are saved to. */
export function givenStoredTickers(raw: string): void {
    storage.set(TICKERS_STORAGE_KEY, raw);
}

/** What the browser holds under the followed tickers' key. */
export function storedTickers(): unknown {
    return storage.getObject(TICKERS_STORAGE_KEY, z.unknown());
}
