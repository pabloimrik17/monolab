import { http, HttpResponse } from "msw";
import { API_URL, investlabApi } from "./vitest-integration-setup.ts";
import type { QuoteDto } from "../../data/contracts/quote.dto.ts";
import type { ApiErrorDto } from "@m0n0lab/investlab-core";

/** The API has these quotes; any other symbol has none. */
export function givenQuotesFor(quotes: Readonly<Record<string, Omit<QuoteDto, "symbol">>>): void {
    investlabApi.use(
        http.get(`${API_URL}/quotes`, ({ request }) => {
            const symbols = new URL(request.url).searchParams.get("symbols")?.split(",") ?? [];
            return HttpResponse.json(
                symbols.flatMap((symbol): QuoteDto[] => {
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
