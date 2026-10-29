import { http, HttpResponse } from "msw";
import { API_URL, investlabApi, storage } from "./vitest-integration-setup.ts";
import type { QuoteDto } from "#data/shared/dto/quote.dto.ts";
import type { ApiErrorDto } from "@m0n0lab/investlab-core";

const TICKERS_KEY = "wealth-tracker-tickers";

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

/** The browser holds this text under the key the followed tickers are saved to. */
export function givenStoredTickers(raw: string): void {
    storage.set(TICKERS_KEY, raw);
}

/** What the browser holds under the followed tickers' key. */
export function storedTickers(): unknown {
    return storage.getObject<unknown>(TICKERS_KEY);
}
