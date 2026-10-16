import { http, HttpResponse } from "msw";
import { FINNHUB_API_KEY, finnhub } from "./vitest-integration-setup.ts";

const FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote";
/** What Finnhub answers for a symbol it has no data for. */
const NO_DATA = { c: 0, d: null, dp: null };

interface MarketQuote {
    readonly price: number;
    readonly change: number;
    readonly changePercent: number;
}

/** What Finnhub answers a request without a valid key. */
const INVALID_KEY = () => HttpResponse.json({ error: "Invalid API key" }, { status: 401 });

/** Market data has these quotes; any other symbol has none. Requests without the configured key are rejected. */
export function givenQuotesFor(quotes: Readonly<Record<string, MarketQuote>>): void {
    finnhub.use(
        http.get(FINNHUB_QUOTE_URL, ({ request }) => {
            const params = new URL(request.url).searchParams;
            if (params.get("token") !== FINNHUB_API_KEY) {
                return INVALID_KEY();
            }
            const symbol = params.get("symbol") ?? "";
            const quote = quotes[symbol];
            const current = quote
                ? { c: quote.price, d: quote.change, dp: quote.changePercent }
                : NO_DATA;
            return HttpResponse.json({ ...current, h: 0, l: 0, o: 0, pc: 0, t: 0 });
        }),
    );
}

/** Market data rejects the configured key, as after it is revoked. */
export function givenMarketDataRejectsTheKey(): void {
    finnhub.use(http.get(FINNHUB_QUOTE_URL, INVALID_KEY));
}

/** Market data cannot be reached. */
export function givenMarketDataUnavailable(): void {
    finnhub.use(http.get(FINNHUB_QUOTE_URL, () => HttpResponse.error()));
}
